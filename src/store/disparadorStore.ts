import { create } from 'zustand';
import { getEndpoints } from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import * as XLSX from "xlsx";
import { useApiSettingsStore } from './apiSettingsStore'; // Importar o store de configurações da API

interface Instance {
  name: string;
  connectionStatus: string;
}

interface DisparadorState {
  instances: Instance[];
  isLoading: boolean;
  qrCode: string | null;
  qrInstance: string | null;
  contatos: any[];
  interromper: boolean;
  
  loadInstances: () => Promise<void>;
  fetchQrCode: (instanceName: string) => Promise<void>;
  resetQr: () => void;
  setContatos: (contatos: any[]) => void;
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
  isLoading: false,
  qrCode: null,
  qrInstance: null,
  contatos: [],
  interromper: false,

  resetQr: () => {
    set({ qrCode: null, qrInstance: null });
  },

  loadInstances: async () => {
    set({ isLoading: true });
    try {
      const endpoints = useApiSettingsStore.getState().endpoints; // Obter endpoints do store
      const response = await fetch(endpoints.BUSCA_INSTANCIAS);
      if (!response.ok) throw new Error("Falha ao buscar instâncias.");
      const data = await response.json();
      const instances = data.instances || data;
      set({ instances: Array.isArray(instances) ? instances : [] });
    } catch (error) {
      showError("Erro ao carregar instâncias: " + (error as Error).message);
      set({ instances: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQrCode: async (instanceName: string) => {
    if (get().qrInstance === instanceName && get().qrCode) return;
    
    set({ qrCode: null, qrInstance: instanceName });
    try {
      const endpoints = useApiSettingsStore.getState().endpoints; // Obter endpoints do store
      const response = await fetch(`${endpoints.QR_CODE}?instanceName=${encodeURIComponent(instanceName)}`);
      if (!response.ok) throw new Error("Falha ao gerar QR Code.");
      const data = await response.json();
      if (data.code) {
        set({ qrCode: `data:image/png;base64,${data.code}` });
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
      const endpoints = useApiSettingsStore.getState().endpoints; // Obter endpoints do store
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
      const response = await fetch(endpoints.FILE_UPLOAD, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-File-Name": sanitizedName },
        body: file,
      });
      if (!response.ok) throw new Error(`Erro no upload: ${response.status}`);
      const result = await response.json();
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
    const endpoints = useApiSettingsStore.getState().endpoints; // Obter endpoints do store

    for (let i = 0; i < list.length; i++) {
      if (get().interromper) {
        log += "⏹️ Interrompido pelo usuário\n";
        break;
      }
      const item = list[i];
      const messages = templates.map((tt: any) => {
        const personalizedText = tt.text.replace(/\{(\w+)\}/g, (_: any, k: string) => {
          const full = item[k] || "";
          return tt.text.includes(`{${k.split(" ")[0]}}`) ? full.split(" ")[0] : full;
        });
        return { type: tt.type, text: personalizedText, mediaUrl: tt.mediaUrl };
      });
      const choice = instances[i % instances.length];
      try {
        const res = await fetch(endpoints.DISPARO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero: item.telefone.replace(/\D/g, ""),
            mensagens: messages,
            tempoMin,
            tempoMax,
            usarIA,
            instancia: choice,
            campaignName,
            publicTarget,
            content
          }),
        });
        const txt = await res.text();
        if (!res.ok) throw new Error(txt);
        sucessos++;
        log += `✅ ${item.telefone} via ${choice}\n`;
      } catch (e) {
        erros++;
        log += `❌ ${item.telefone} via ${choice} – Erro: ${(e as Error).message}\n`;
      }
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
      const endpoints = useApiSettingsStore.getState().endpoints;
      const response = await fetch(endpoints.SCHEDULE_CAMPAIGN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_group_id: params.campaignGroupId,
          nome_campanha: params.campaignName,
          publico_alvo: params.publicTarget,
          criativo_campanha: params.content,
          hora_agendamento: params.horaAgendamento,
          dispatch_order: params.dispatchOrder,
          instancias_selecionadas: params.instances,
          templates_mensagem: params.templates,
          usar_ia: params.usarIA,
          tempo_min_intervalo: params.tempoMin,
          tempo_max_intervalo: params.tempoMax,
          contatos_json: params.contatos,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha ao agendar disparo: ${response.status} - ${errorText}`);
      }
      // showSuccess("Disparo agendado com sucesso!"); // Removido daqui, será mostrado após todos os disparos
    } catch (error) {
      showError("Erro ao agendar disparo: " + (error as Error).message);
      throw error;
    }
  },

  stopSending: () => set({ interromper: true }),

  setContatos: (contatos) => set({ contatos }),
}));