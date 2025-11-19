import { create } from 'zustand';
import { showSuccess, showError } from '../utils/toast';
import * as XLSX from "xlsx";
import {
  fetchAllInstances,
  generateQrCode,
  getConnectionState,
  sendTextMessage,
  sendMediaMessage,
  filterInstances
} from '../services/evolutionApi';
import { uploadFileToSupabase } from '../services/supabaseStorage';
import { supabase } from '../services/supabaseClient';

interface Instance {
  name: string;
  connectionStatus: string;
}

interface DisparadorState {
  instances: Instance[];
  filteredInstances: Instance[];
  isLoading: boolean;
  qrCode: string | null;
  qrInstance: string | null;
  contatos: any[];
  interromper: boolean;
  instanceFilter: string;

  loadInstances: () => Promise<void>;
  fetchQrCode: (instanceName: string) => Promise<void>;
  resetQr: () => void;
  setContatos: (contatos: any[]) => void;
  setInstanceFilter: (filter: string) => void;
  uploadFile: (file: File) => Promise<{ contatos: any[]; variables: string[] }>;
  mediaUpload: (file: File) => Promise<string | null>;
  sendMessages: (params: {
    contatos: any[];
    instances: string[];
    tempoMin: number;
    tempoMax: number;
    usarIA: boolean;
    templates: any[];
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
    contatos: any[];
    instances: string[];
    templates: any[];
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
      const instances = await fetchAllInstances();
      const formattedInstances = instances.map(instance => ({
        name: instance.name,
        connectionStatus: instance.status
      }));
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
      const rows = arr as any[][];
      const phoneField = header.find((h: string) => h.toLowerCase().includes("telefone")) || header[0];
      const contatos: any[] = [];
      const extractPhones = (raw: string) =>
        String(raw || "")
          .split(",")
          .map((p) => p.replace(/\D/g, ""))
          .filter((n) => n.length >= 10)
          .map((n) => (n.length <= 11 ? "55" + n : n.length === 12 && !n.startsWith("55") ? "55" + n : n));
      rows.forEach((r) => {
        const obj: any = {};
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
          personalizedText = personalizedText.replace(/\{(\w+)\}/g, (_: any, key: string) => {
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

      const { data: profile } = await supabase.from('users_dispara_lead_saas').select('tenant_id').eq('id', user.id).single();
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
        .from('schedules_dispara_lead_saas')
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
      status: instance.connectionStatus as any
    }));
    const filteredEvolution = filterInstances(evolutionInstances, filter);
    // Convert back to Instance format
    const filtered = filteredEvolution.map(instance => ({
      name: instance.name,
      connectionStatus: instance.status
    }));
    set({ filteredInstances: filtered });
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
      const { data: profile } = await supabase.from('users_dispara_lead_saas').select('tenant_id').eq('id', user.id).single();
      if (profile) {
        const { error } = await supabase
          .from('message_logs_dispara_lead_saas')
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