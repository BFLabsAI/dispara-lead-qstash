import { create } from 'zustand';
import { ENDPOINTS } from '../services/api';
import { showSuccess, showError } from '../utils/toast';

interface DisparadorState {
  instances: any[];
  isLoading: boolean;
  qrCode: string | null;
  qrInstance: string | null;
  contatos: any[];
  interromper: boolean;
  
  // Actions
  loadInstances: () => Promise<void>;
  fetchQrCode: (instanceName: string) => Promise<void>;
  resetQr: () => void;
  setContatos: (contatos: any[]) => void;
  uploadFile: (file: File) => Promise<{ variables: string[] }>;
  mediaUpload: (file: File) => Promise<string>;
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
  setInterromper: (value: boolean) => void;
}

export const useDisparadorStore = create<DisparadorState>((set, get) => ({
  instances: [],
  isLoading: false,
  qrCode: null,
  qrInstance: null,
  contatos: [],
  interromper: false,

  loadInstances: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(ENDPOINTS.BUSCA_INSTANCIAS);
      const data = await response.json();
      set({ instances: data });
    } catch (error) {
      showError("Erro ao carregar instâncias");
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQrCode: async (instanceName: string) => {
    try {
      const response = await fetch(`${ENDPOINTS.QR_CODE}?instanceName=${encodeURIComponent(instanceName)}`);
      const data = await response.json();
      set({ qrCode: data.qrCode, qrInstance: instanceName });
    } catch (error) {
      showError("Erro ao gerar QR Code");
    }
  },

  resetQr: () => {
    set({ qrCode: null, qrInstance: null });
  },

  setContatos: (contatos: any[]) => {
    set({ contatos });
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(ENDPOINTS.FILE_UPLOAD, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      return { variables: result.variables || [] };
    } catch (error) {
      throw new Error("Erro ao fazer upload do arquivo");
    }
  },

  mediaUpload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(ENDPOINTS.FILE_UPLOAD, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      return result.url || '';
    } catch (error) {
      throw new Error("Erro ao fazer upload do arquivo");
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
      const messages = templates.map((tt: any) => {
        const personalizedText = tt.text.replace(/\{(\w+)\}/g, (_: any, k: string) => {
          const full = item[k] || "";
          return tt.text.includes(`{${k.split(" ")[0]}}`) ? full.split(" ")[0] : full;
        });
        return { type: tt.type, text: personalizedText, mediaUrl: tt.mediaUrl };
      });
      const choice = instances[i % instances.length];
      try {
        const res = await fetch(ENDPOINTS.DISPARO, {
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

  setInterromper: (value: boolean) => {
    set({ interromper: value });
  },
}));