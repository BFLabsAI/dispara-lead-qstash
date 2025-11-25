import { create } from 'zustand';
import { showSuccess, showError } from '../utils/toast';
import * as XLSX from "xlsx";
import {
  fetchAllInstances,
  generateQrCode,
  getConnectionState,
  sendTextMessage,
  sendMediaMessage,
  filterInstances,
  type EvolutionInstance
} from '../services/evolutionApi';
import { uploadFileToSupabase } from '../services/supabaseStorage';
import { supabase } from '../services/supabaseClient';
import { useAdminStore } from './adminStore';
import { qstashClient } from '../services/qstashClient';

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
  qrInstance: string | null;
  contatos: Contact[];
  interromper: boolean;
  instanceFilter: string;

  loadInstances: () => Promise<void>;
  syncInstances: () => Promise<void>; // Added syncInstances
  fetchQrCode: (instanceName: string) => Promise<void>;
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
  sendAdvancedCampaign: (params: {
    contatos: Contact[];
    instances: string[];
    tempoMin: number;
    tempoMax: number;
    templates: MessageTemplate[];
    campaignName: string;
    publicTarget: string;
    content: string;
    scheduledFor?: string;
  }) => Promise<void>;
}

export const useDisparadorStore = create<DisparadorState>((set, get) => ({
  instances: [],
  filteredInstances: [],
  isLoading: false,
  qrCode: null,
  qrInstance: null,
  contatos: [],
  interromper: false,
  instanceFilter: '',

  resetQr: () => {
    set({ qrCode: null, qrInstance: null });
  },

  loadInstances: async () => {
    set({ isLoading: true });
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check for impersonation (Super Admin)
      const impersonatedTenantId = useAdminStore.getState().impersonatedTenantId;
      let targetTenantId = impersonatedTenantId;

      if (!targetTenantId) {
        const { data: userData } = await supabase
          .from('users_dispara_lead_saas_02')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (!userData?.tenant_id) {
          console.error("Tenant ID not found for user:", user.id);
          throw new Error("Tenant não encontrado");
        }
        targetTenantId = userData.tenant_id;
      }

      console.log("Loading instances for Tenant ID:", targetTenantId);

      // Fetch tenant's instances from our DB (Source of Truth)
      const { data: dbInstances, error: dbError } = await supabase
        .from('instances_dispara_lead_saas_02')
        .select('instance_name, connection_status')
        .eq('tenant_id', targetTenantId);

      if (dbError) {
        console.error("Error fetching instances from DB:", dbError);
      }

      console.log("DB Instances found:", dbInstances);

      if (!dbInstances || dbInstances.length === 0) {
        console.warn("No instances found in DB for this tenant.");
        set({ instances: [], filteredInstances: [] });
        return;
      }

      // Map DB instances directly to UI format
      // The DB is now the source of truth for both existence and status
      // BUT we need to sync with Evolution API for real-time status
      let allInstances: EvolutionInstance[] = [];
      try {
        allInstances = await fetchAllInstances();
      } catch (apiError) {
        console.error("Failed to fetch from Evolution API:", apiError);
        // If API fails, we fall back to DB status
      }

      const formattedInstances = dbInstances.map(dbInst => {
        // Find the corresponding instance in Evolution API to get real-time status
        const apiInst = allInstances.find(i => i.name === dbInst.instance_name);

        // Use API status if available, otherwise fallback to DB status, then 'DISCONNECTED'
        const realTimeStatus = apiInst ? apiInst.status : (dbInst.connection_status || "DISCONNECTED");

        return {
          name: dbInst.instance_name,
          connectionStatus: realTimeStatus
        };
      });

      set({
        instances: formattedInstances,
        filteredInstances: formattedInstances
      });
    } catch (error) {
      showError("Erro ao carregar instâncias: " + (error as Error).message);
      set({ instances: [], filteredInstances: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  syncInstances: async () => {
    set({ isLoading: true });
    try {
      const evoInstances = await fetchAllInstances();

      const { data: dbInstances, error: dbError } = await supabase
        .from('instances_dispara_lead_saas_02')
        .select('*');

      if (dbError) throw dbError;

      for (const evoInst of evoInstances) {
        // Find matching DB instance
        const match = dbInstances?.find(dbInst => dbInst.instance_name === evoInst.name);

        if (match) {
          // Update DB with Evo data (status, apiKey)
          await supabase
            .from('instances_dispara_lead_saas_02')
            .update({
              connection_status: evoInst.status,
              api_key: (evoInst as any).apiKey, // Update API Key
              updated_at: new Date().toISOString()
            })
            .eq('id', match.id);
        }
      }

      // Reload instances to reflect changes
      await get().loadInstances();
      showSuccess("Sincronização concluída com sucesso!");
    } catch (error) {
      console.error("Sync error:", error);
      showError("Erro ao sincronizar instâncias: " + (error as Error).message);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQrCode: async (instanceName: string) => {
    if (get().qrInstance === instanceName && get().qrCode) return;

    set({ qrCode: null, qrInstance: instanceName });
    try {
      const data = await generateQrCode(instanceName);
      if (data.qrCode) {
        set({ qrCode: data.qrCode });
      } else {
        set({ qrCode: null });
        showError("Já está conectado ou houve um erro.");
      }
    } catch (error) {
      showError("Erro ao buscar QR Code: " + (error as Error).message);
      set({ qrCode: null });
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
    const { contatos, instances, tempoMin, tempoMax, usarIA, templates, campaignName, publicTarget, content } = params;
    set({ interromper: false });
    let sucessos = 0;
    let erros = 0;
    let log = "";
    const list = contatos.length ? contatos : [];

    for (let i = 0; i < list.length; i++) {
      if (get().interromper) {
        log += "⏹️ Interrompido pelo usuário\n";
        break;
      }
      const item = list[i];
      const choice = instances[i % instances.length];

      try {
        // Send each message in the template
        for (const template of templates) {
          let personalizedText = template.text;

          // Replace variables in the message
          personalizedText = personalizedText.replace(/\{(\w+)\}/g, (_: string, key: string) => {
            const fullValue = item[key] || "";
            // If the template uses just the first word, return that
            if (template.text.includes(`{${key.split(" ")[0]}}`)) {
              return fullValue.split(" ")[0];
            }
            return fullValue;
          });

          // Send message based on type
          if (template.type === 'texto' || !template.mediaUrl) {
            // Send text message
            await sendTextMessage({
              instanceName: choice,
              number: item.telefone,
              text: personalizedText
            });
          } else if (template.type === 'imagem' && template.mediaUrl) {
            // Send image message
            await sendMediaMessage({
              instanceName: choice,
              number: item.telefone,
              mediatype: 'image',
              media: template.mediaUrl,
              caption: personalizedText
            });
          } else if (template.type === 'video' && template.mediaUrl) {
            // Send video message
            await sendMediaMessage({
              instanceName: choice,
              number: item.telefone,
              mediatype: 'video',
              media: template.mediaUrl,
              caption: personalizedText
            });
          } else if (template.type === 'audio' && template.mediaUrl) {
            // Send audio message
            await sendMediaMessage({
              instanceName: choice,
              number: item.telefone,
              mediatype: 'audio',
              media: template.mediaUrl
            });
          }

          // Small delay between messages for the same contact
          await new Promise(r => setTimeout(r, 500));
        }

        // Save success log to database
        await saveMessageLog({
          numero: item.telefone,
          tipo_envio: 'sucesso',
          usarIA: usarIA,
          instancia: choice,
          texto: templates.map(t => t.text).join(', '),
          nome_campanha: campaignName,
          publico: publicTarget,
          criativo: content,
          tipo_campanha: 'Disparo Pontual'
        });

        sucessos++;
        log += `✅ ${item.telefone} via ${choice}\n`;
      } catch (e) {
        // Save error log to database
        await saveMessageLog({
          numero: item.telefone,
          tipo_envio: 'erro',
          usarIA: usarIA,
          instancia: choice,
          texto: templates.map(t => t.text).join(', '),
          nome_campanha: campaignName,
          publico: publicTarget,
          criativo: content,
          tipo_campanha: 'Disparo Pontual'
        });

        erros++;
        log += `❌ ${item.telefone} via ${choice} – Erro: ${(e as Error).message}\n`;
      }

      // Apply delay between contacts
      const delay = (Math.random() * (tempoMax - tempoMin) + tempoMin) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }

    const finalLog = `RELATÓRIO DE ENVIO\n\nTotal: ${list.length}\nEnviados com sucesso: ${sucessos}\nTotal com erro: ${erros}\n\n--- DETALHES ---\n${log}`;
    const blob = new Blob([finalLog], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "log_disparo.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    showSuccess(get().interromper ? "Envio interrompido!" : "Envio concluído!");
    return { sucessos, erros, log: finalLog };
  },

  scheduleCampaign: async (params) => {
    try {
      // Get current user to get tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: profile } = await supabase.from('users_dispara_lead_saas_02').select('tenant_id').eq('id', user.id).single();
      if (!profile) throw new Error("Perfil de usuário não encontrado.");

      // Map params to the existing table structure
      const campaignData = {
        tenant_id: profile.tenant_id,
        campaign_name: params.campaignName,
        scheduled_at: params.horaAgendamento,
        status: 'pending',
        contacts_json: params.contatos,
        message_template: params.templates,
        instance_names: params.instances,
        created_by: user.id,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('schedules_dispara_lead_saas_02')
        .insert(campaignData);

      if (error) {
        throw new Error(`Falha ao agendar disparo: ${error.message}`);
      }

      showSuccess("Campanha agendada com sucesso!");
    } catch (error) {
      showError("Erro ao agendar disparo: " + (error as Error).message);
      throw error;
    }
  },

  stopSending: () => set({ interromper: true }),

  setContatos: (contatos) => set({ contatos }),

  setInstanceFilter: (filter: string) => {
    set({ instanceFilter: filter });
    const { instances } = get();
    // Convert instances to EvolutionInstance format for filtering
    const evolutionInstances = instances.map(instance => ({
      name: instance.name,
      status: instance.connectionStatus as EvolutionInstance['status']
    }));
    const filteredEvolution = filterInstances(evolutionInstances, filter);
    // Convert back to Instance format
    const filtered = filteredEvolution.map(instance => ({
      name: instance.name,
      connectionStatus: instance.status
    }));
    set({ filteredInstances: filtered });
  },

  sendAdvancedCampaign: async (params: {
    contatos: Contact[];
    instances: string[];
    tempoMin: number;
    tempoMax: number;
    templates: MessageTemplate[];
    campaignName: string;
    publicTarget: string;
    content: string;
    scheduledFor?: string; // ISO string if scheduled
  }) => {
    const { contatos, instances, tempoMin, tempoMax, templates, campaignName, publicTarget, content, scheduledFor } = params;
    set({ isLoading: true });

    try {
      // 1. Get User & Tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check for impersonation (Super Admin)
      const impersonatedTenantId = useAdminStore.getState().impersonatedTenantId;
      let targetTenantId = impersonatedTenantId;

      if (!targetTenantId) {
        const { data: userData } = await supabase
          .from('users_dispara_lead_saas_02')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        targetTenantId = userData?.tenant_id;
      }

      if (!targetTenantId) throw new Error("Tenant não encontrado");

      // 2. Create Campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns_dispara_lead_saas_02')
        .insert({
          tenant_id: targetTenantId,
          user_id: user.id,
          name: campaignName,
          target_audience: publicTarget,
          creative: content,
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

          // Prepare Log
          logsToInsert.push({
            id: messageId,
            tenant_id: targetTenantId,
            campaign_id: campaign.id,
            instance_name: instanceName,
            phone_number: contact.telefone,
            message_content: personalizedText,
            status: 'pending',
            campaign_name: campaignName,
            campaign_type: scheduledFor ? 'Agendada (QStash)' : 'Imediata (QStash)',
            metadata: {
              publico: publicTarget,
              criativo: content
            }
          });

          // Calculate random delay for this message (ms)
          const randomDelay = Math.floor(Math.random() * (tempoMax - tempoMin + 1) + tempoMin) * 1000;
          accumulatedDelay += randomDelay;

          // Determine delivery time
          // If scheduled, baseTime is the schedule time. If immediate, baseTime is now.
          // We add accumulatedDelay (spacing) to this base time.
          const deliveryTime = baseTime + accumulatedDelay;

          // Prepare QStash Payload
          const qstashPayload: any = {
            messageId,
            phoneNumber: contact.telefone,
            messageContent: personalizedText,
            instanceName,
            campaignId: campaign.id,
            tenantId: targetTenantId,
            mediaUrl: template.mediaUrl,
            mediaType: template.type !== 'texto' ? template.type : undefined
          };

          if (scheduledFor) {
            // For scheduled campaigns, use absolute timestamp (seconds)
            qstashPayload.notBefore = Math.floor(deliveryTime / 1000);
          } else {
            // For immediate campaigns, use relative delay (seconds)
            qstashPayload.delay = Math.floor(accumulatedDelay / 1000);
          }

          messagesToEnqueue.push(qstashPayload);
        }
      }

      // 4. Insert Logs (Bulk)
      const { error: logsError } = await supabase
        .from('message_logs_dispara_lead_saas_02')
        .insert(logsToInsert);

      if (logsError) throw logsError;

      // 5. Enqueue to QStash
      await qstashClient.enqueueBatch(messagesToEnqueue);

      // 6. Update Status
      await supabase
        .from('message_logs_dispara_lead_saas_02')
        .update({ status: 'queued', queued_at: new Date().toISOString() })
        .eq('campaign_id', campaign.id);

      await supabase
        .from('campaigns_dispara_lead_saas_02')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', campaign.id);

      showSuccess(`Campanha iniciada! ${messagesToEnqueue.length} mensagens enfileiradas.`);

    } catch (error) {
      console.error("Erro ao enviar campanha avançada:", error);
      showError("Falha ao iniciar campanha: " + (error as Error).message);
    } finally {
      set({ isLoading: false });
    }
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
          .from('message_logs_dispara_lead_saas_02')
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