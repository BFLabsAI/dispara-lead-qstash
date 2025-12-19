import { create } from 'zustand';
import { showSuccess, showError } from '../utils/toast';
import * as XLSX from "xlsx";
import {
  /* fetchAllInstances (unused), */
  generateQrCode,
  disconnectInstanceClient,
  sendTextMessage,
  sendMediaMessage,
  type UazapiInstance
} from '../services/uazapiClient';
import { uploadFileToSupabase } from '../services/supabaseStorage';
import { supabase, SUPABASE_URL } from '../services/supabaseClient';
import { useAdminStore } from './adminStore';
// import { qstashClient } from '../services/qstashClient';

interface Instance {
  name: string;
  connectionStatus: string;
}

type Contact = Record<string, any>;

interface MessageTemplate {
  type: 'texto' | 'imagem' | 'video' | 'audio';
  text: string;
  mediaUrl?: string;
}

interface DisparadorState {
  instances: Instance[];
  filteredInstances: Instance[];
  isLoading: boolean;
  qrCode: string | null;
  qrTimestamp: number | null; // Track when QR was generated
  isQrDialogOpen: boolean;    // Explicitly control dialog visibility
  qrInstance: string | null;
  contatos: Contact[];
  interromper: boolean;
  instanceFilter: string;
  disconnectingInstance: string | null;

  syncInstances: (silent?: boolean) => Promise<void>;
  loadInstances: (silent?: boolean) => Promise<void>;
  disconnectInstance: (instanceName: string) => Promise<void>;
  fetchQrCode: (instanceName: string, forceNew?: boolean) => Promise<void>;
  closeQrDialog: () => void;
  resetQr: () => void;
  setContatos: (contatos: Contact[]) => void;
  setInstanceFilter: (filter: string) => void;
  uploadFile: (file: File) => Promise<{ contatos: Contact[]; variables: string[] }>;
  mediaUpload: (file: File) => Promise<string | null>;
  sendMessages: (params: {
    contatos: Contact[];
    instances: string[];
    tempoMin: number;
    tempoMax: number;
    usarIA: boolean;
    templates: MessageTemplate[];
    campaignName: string;
    publicTarget: string;
    content: string;
    scheduledFor?: string;
  }) => Promise<{ sucessos: number; erros: number; log: string }>;
  stopSending: () => void;
  scheduleCampaign: (params: { // Nova função para agendar campanha
    campaignGroupId: string;
    dispatchOrder: number;
    campaignName: string;
    publicTarget: string;
    content: string;
    contatos: Contact[];
    instances: string[];
    templates: MessageTemplate[];
    tempoMin: number;
    tempoMax: number;
    usarIA: boolean;
    horaAgendamento: string;
  }) => Promise<void>;

}

export const useDisparadorStore = create<DisparadorState>((set, get) => ({
  instances: [],
  filteredInstances: [],
  isLoading: false,
  qrCode: null,
  qrTimestamp: null,
  isQrDialogOpen: false,
  qrInstance: null,
  contatos: [],
  interromper: false,
  instanceFilter: '',
  disconnectingInstance: null,

  resetQr: () => {
    set({ qrCode: null, qrInstance: null, qrTimestamp: null, isQrDialogOpen: false });
  },

  closeQrDialog: () => {
    // Just close the dialog but keep the state (so timer persists)
    set({ isQrDialogOpen: false });
  },

  loadInstances: async (silent = false) => {
    if (!silent) set({ isLoading: true });
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Fetch user profile to check Role and Tenant
      const { data: userData } = await supabase
        .from('users_dispara_lead_saas_02')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) {
        console.error("Tenant ID not found for user:", user.id);
        throw new Error("Tenant não encontrado");
      }

      // Determine Target Tenant
      // Default to user's own tenant
      let targetTenantId = userData.tenant_id;

      // Only allow impersonation if user is actually a Super Admin
      // We check this via RPC or by trusting that only Super Admins can set the store (but store is client-side).
      // Safer: check RPC.
      const { data: isSuper } = await supabase.rpc('is_super_admin');
      const impersonatedId = useAdminStore.getState().impersonatedTenantId;

      if (isSuper && impersonatedId) {
        targetTenantId = impersonatedId;
      } else if (impersonatedId && !isSuper) {
        // Detected stale state: Regular user with admin store set. Clear it.
        console.warn("Clearing stale admin state for regular user");
        useAdminStore.getState().setImpersonatedTenantId(null);
        useAdminStore.getState().setAdminTenantId(null);
      }

      // Fetch tenant's instances from our DB (Source of Truth)
      const { data: dbInstances, error: dbError } = await supabase
        .from('instances_dispara_lead_saas_02')
        .select('instance_name, status')
        .eq('tenant_id', targetTenantId);

      if (dbError) {
        console.error("Error fetching instances from DB:", dbError);
      }

      if (!dbInstances || dbInstances.length === 0) {
        set({ instances: [], filteredInstances: [] });
        return;
      }

      // Map DB instances directly to UI format
      const formattedInstances = dbInstances.map(dbInst => ({
        name: dbInst.instance_name,
        connectionStatus: dbInst.status || 'disconnected' // Correct column is 'status'
      }));

      set({
        instances: formattedInstances,
        filteredInstances: formattedInstances
      });
    } catch (error) {
      showError("Erro ao carregar instâncias: " + (error as Error).message);
      set({ instances: [], filteredInstances: [] });
    } finally {
      if (!silent) set({ isLoading: false });
    }
  },

  syncInstances: async (silent = false) => {
    if (!silent) set({ isLoading: true });
    try {
      const { instances } = get();
      if (!instances.length) {
        // If no instances loaded, try loading first
        await get().loadInstances(silent);
        const { instances: updatedList } = get();
        if (!updatedList.length) {
          if (!silent) set({ isLoading: false });
          return;
        }
      }

      // We need to import getConnectionStatus here or move it to top imports
      // Importing locally to avoid circular dependency issues if any
      const { getConnectionStatus } = await import('../services/uazapiClient');

      // Process sequentially to avoid rate limits? Or parallel?
      // Parallel is fine for a few instances.
      const syncPromises = get().instances.map(async (inst) => {
        try {
          // Call proxy with ensure_webhooks=true as requested by user
          // "refresh calls check connection then webhook if webhook ok do nothing, if not setupwebhooks"
          await getConnectionStatus(inst.name, true);
        } catch (e) {
          console.error(`Failed to sync ${inst.name}:`, e);
        }
      });

      await Promise.all(syncPromises);

      // Refresh data from DB to get updated statuses
      await get().loadInstances(silent);
      if (!silent) showSuccess("Instâncias sincronizadas.");

    } catch (error) {
      if (!silent) showError("Erro ao sincronizar: " + (error as Error).message);
    } finally {
      if (!silent) set({ isLoading: false });
    }
  },

  fetchQrCode: async (instanceName: string, forceNew = false) => {
    const { qrCode: oldQr, qrInstance: oldInstance, qrTimestamp: oldTimestamp } = get();

    // Set target instance and open dialog immediately
    set({ qrInstance: instanceName, isQrDialogOpen: true });

    try {
      const data = await generateQrCode(instanceName);

      if (data.qrCode) {
        const newQr = data.qrCode;

        // If it's the exact same string (cached from backend) AND we have a valid timestamp, keep old timestamp
        // Otherwise, it's considered "new-ish" or we lost tracking, so reset timestamp.
        let newTimestamp = Date.now();
        if (oldQr === newQr && oldInstance === instanceName && oldTimestamp) {
          const age = Date.now() - oldTimestamp;
          if (age < 120000) {
            newTimestamp = oldTimestamp; // Keep original time
          }
        }

        set({ qrCode: newQr, qrTimestamp: newTimestamp });
      } else {
        const responseFn = data as any;
        if (responseFn.status === 'connected') {
          showSuccess("Instância já conectada!");
          set({ isQrDialogOpen: false });
          get().loadInstances(true);
        } else {
          set({ qrCode: null, qrTimestamp: null });
          showError("Erro: " + (responseFn.message || "Não foi possível gerar QR Code"));
        }
      }
    } catch (error) {
      showError("Erro ao buscar QR Code: " + (error as Error).message);
      set({ qrCode: null });
    }
  },

  disconnectInstance: async (instanceName: string) => {
    // Set localized loading state
    set({ disconnectingInstance: instanceName });

    try {
      await disconnectInstanceClient(instanceName);
      showSuccess("Instância desconectada.");
      // Reload silently to update status
      await get().loadInstances(true);
    } catch (error) {
      showError("Erro ao desconectar: " + (error as Error).message);
    } finally {
      // Clear localized loading state
      set({ disconnectingInstance: null });

      // If we are disconnecting the instance currently showing (or hidden) in QR dialog/state, reset it.
      // This prevents "Expired" state from persisting to the next connection attempt.
      if (get().qrInstance === instanceName) {
        get().resetQr();
      }
    }
  },

  uploadFile: async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const header = (arr.shift() as string[]).map((h: string) => String(h).trim());
      const rows = arr as Contact[][];
      const phoneField = header.find((h: string) => h.toLowerCase().includes("telefone")) || header[0];
      const contatos: Contact[] = [];
      const extractPhones = (raw: string) =>
        String(raw || "")
          .split(",")
          .map((p) => p.replace(/\D/g, ""))
          .filter((n) => n.length >= 10)
          .map((n) => (n.length <= 11 ? "55" + n : n.length === 12 && !n.startsWith("55") ? "55" + n : n));
      rows.forEach((r) => {
        const obj: Contact = {};
        header.forEach((h, i) => (obj[h] = r[i] || ""));
        extractPhones(obj[phoneField]).forEach((num) => contatos.push({ ...obj, telefone: num }));
      });
      const variables = header.filter((h: string) => h !== phoneField);
      set({ contatos });
      showSuccess(`${contatos.length} contatos carregados.`);
      return { contatos, variables };
    } catch (error) {
      showError("Erro ao processar arquivo: " + (error as Error).message);
      return { contatos: [], variables: [] };
    }
  },

  mediaUpload: async (file: File) => {
    try {
      const result = await uploadFileToSupabase(file);

      if (result.fileUrl) {
        showSuccess("Upload concluído!");
        return result.fileUrl;
      }

      throw new Error("URL do arquivo não encontrada.");
    } catch (error) {
      showError("Falha no upload: " + (error as Error).message);
      return null;
    }
  },

  sendMessages: async (params) => {
    const { contatos, instances, tempoMin, tempoMax, templates, campaignName, publicTarget, content, scheduledFor, usarIA } = params as any; // Allow extra params for now or update interface
    set({ isLoading: true });

    try {
      // 1. Get User & Tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Fetch user profile
      const { data: userData } = await supabase
        .from('users_dispara_lead_saas_02')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error("Tenant não encontrado");

      // Check for impersonation (Super Admin ONLY)
      let targetTenantId = userData.tenant_id;

      const { data: isSuper } = await supabase.rpc('is_super_admin');
      const impersonatedId = useAdminStore.getState().impersonatedTenantId;

      if (isSuper && impersonatedId) {
        targetTenantId = impersonatedId;
      }

      // Check mandatory campaign name (if missing, auto-generate)
      const finalCampaignName = campaignName || `Disparo Rápido ${new Date().toLocaleTimeString()}`;

      // 2. Create Campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns_dispara_lead_saas_02')
        .insert({
          tenant_id: targetTenantId,
          user_id: user.id,
          name: finalCampaignName,
          target_audience: publicTarget || "Lista Manual",
          creative: content || "Conteúdo Variável",
          status: 'pending',
          total_messages: contatos.length * templates.length,
          instances: instances,
          delay_min: tempoMin,
          delay_max: tempoMax,
          is_scheduled: !!scheduledFor,
          scheduled_for: scheduledFor || null
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 3. Prepare Messages & Logs
      const messagesToEnqueue: any[] = [];
      const logsToInsert: any[] = [];

      // Calculate base delay if scheduled, otherwise start now
      const baseTime = scheduledFor ? new Date(scheduledFor).getTime() : Date.now();
      let accumulatedDelay = 0;

      for (let i = 0; i < contatos.length; i++) {
        const contact = contatos[i];
        const instanceName = instances[i % instances.length];

        for (const template of templates) {
          // Personalize text
          let personalizedText = template.text;
          personalizedText = personalizedText.replace(/\{(\w+)\}/g, (_: string, key: string) => {
            const fullValue = contact[key] || "";
            if (template.text.includes(`{${key.split(" ")[0]}}`)) {
              return fullValue.split(" ")[0];
            }
            return fullValue;
          });

          const messageId = crypto.randomUUID();

          // Calculate random delay for this message (ms)
          const randomDelay = Math.floor(Math.random() * (tempoMax - tempoMin + 1) + tempoMin) * 1000;
          accumulatedDelay += randomDelay;

          // Determine delivery time (Execution Time)
          const deliveryTime = baseTime + accumulatedDelay;
          const deliveryDate = new Date(deliveryTime).toISOString();

          // Prepare Log
          logsToInsert.push({
            id: messageId,
            tenant_id: targetTenantId,
            campaign_id: campaign.id,
            instance_name: instanceName,
            phone_number: contact.telefone,
            message_content: personalizedText,
            status: 'queued', // Init as queued
            scheduled_for: deliveryDate, // Exact execution time
            created_at: new Date().toISOString(), // DB Insert time
            campaign_name: finalCampaignName,
            campaign_type: scheduledFor ? 'Agendada' : 'Imediata',
            metadata: {
              publico: publicTarget,
              criativo: content
            }
          });

          // Prepare QStash Payload
          const qstashPayload: any = {
            messageId,
            phoneNumber: contact.telefone,
            messageContent: personalizedText,
            instanceName,
            instanceToken: undefined, // Cleared if previously set, logic moved to Edge Function
            campaignId: campaign.id,
            tenantId: targetTenantId,
            mediaUrl: template.mediaUrl,
            mediaType: template.type !== 'texto' ? template.type : undefined,
            notBefore: Math.floor(deliveryTime / 1000), // Always use absolute timestamp for precision
            // Use AI endpoint if selected
            destinationUrl: usarIA
              ? `${SUPABASE_URL}/functions/v1/process-message-ai`
              : undefined
          };

          messagesToEnqueue.push(qstashPayload);
        }
      }

      // 4. Insert Logs (Bulk)
      const { error: logsError } = await supabase
        .from('message_logs_dispara_lead_saas_03')
        .insert(logsToInsert);

      if (logsError) throw logsError;

      // 5. Enqueue to QStash via Edge Function (Backend)
      const { data: enqueueData, error: enqueueError } = await supabase.functions.invoke('enqueue-campaign', {
        body: { messages: messagesToEnqueue }
      });

      if (enqueueError) {
        throw new Error(`Erro network Edge Function: ${enqueueError.message}`);
      }

      // Handle "Deep Debug" 200 OK errors
      if (enqueueData && enqueueData.success === false) {
        console.error("QStash Debug Error:", enqueueData);
        throw new Error(`QStash Error: ${enqueueData.error} (Stage: ${enqueueData.stage})`);
      }

      console.log("Enqueue result:", enqueueData);

      // 6. Update Status
      // No need to update queued_at/scheduled_for again, it was set per-message
      await supabase
        .from('campaigns_dispara_lead_saas_02')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', campaign.id);

      showSuccess(`Campanha iniciada! ${messagesToEnqueue.length} mensagens enfileiradas.`);
      return { sucessos: messagesToEnqueue.length, erros: 0, log: "Enfileirado via QStash" }; // Adhere to interface roughly

    } catch (error) {
      console.error("Erro ao enviar campanha avançada:", error);
      showError("Falha ao iniciar campanha: " + (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setContatos: (contatos: Contact[]) => set({ contatos }),
  setInstanceFilter: (filter: string) => set({ instanceFilter: filter }),
  stopSending: () => set({ interromper: true, isLoading: false }),

  scheduleCampaign: async (params) => {
    // Adapt params to sendMessages, mapping horaAgendamento to scheduledFor
    const { horaAgendamento, ...rest } = params;
    await get().sendMessages({
      ...rest,
      scheduledFor: horaAgendamento
    });
  },
}));

// Helper function to save message logs to database
async function saveMessageLog(logData: {
  numero: string;
  tipo_envio: string;
  usarIA: boolean;
  instancia: string;
  texto: string;
  nome_campanha: string;
  publico: string;
  criativo: string;
  tipo_campanha: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users_dispara_lead_saas_02').select('tenant_id').eq('id', user.id).single();
      if (profile) {
        const { error } = await supabase
          .from('message_logs_dispara_lead_saas_03')
          .insert({
            tenant_id: profile.tenant_id,
            instance_name: logData.instancia,
            phone_number: logData.numero,
            message_content: logData.texto,
            status: logData.tipo_envio === 'sucesso' ? 'sent' : 'failed',
            campaign_name: logData.nome_campanha,
            campaign_type: logData.tipo_campanha,
            metadata: {
              publico: logData.publico,
              criativo: logData.criativo,
              usaria: logData.usarIA
            }
          });

        if (error) {
          console.error('Error saving message log:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error saving message log:', error);
  }
}