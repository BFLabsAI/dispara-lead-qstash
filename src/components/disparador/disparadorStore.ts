import { create } from "zustand";
import { showError, showSuccess } from "@/utils/toast";

// Endpoints
const URL_BUSCA_INSTANCIAS = "https://webhook.bflabs.com.br/webhook/busca-instancias-nw";
const URL_QR_CODE = "https://webhook.bflabs.com.br/webhook/atualizar-qr-code-nw";
const URL_DISPARO = "https://webhook.bflabs.com.br/webhook/disparar";
const URL_FILE_UPLOAD = "https://webhook.bflabs.com.br/webhook/file-upload";

interface Instance {
  name: string;
  connectionStatus: string;
}

interface DisparadorState {
  instances: Instance[];
  qrCode: string | null;
  qrInstance: string | null;
  qrCountdown: number;
  isLoading: boolean;
  contatos: any[];
  interromper: boolean;
  templates: any[];

  loadInstances: () => Promise<void>;
  fetchQrCode: (instanceName: string) => Promise<void>;
  resetQr: () => void; // New: reset QR state to prevent random opens
  uploadFile: (file: File) => Promise<{ contatos: any[]; variables: string[] }>;
  mediaUpload: (file: File) => Promise<string | null>;
  sendMessages: (params: {
    contatos: any[];
    instances: string[];
    tempoMin: number;
    tempoMax: number;
    usarIA: boolean;
    templates: any[];
  }) => Promise<{ sucessos: number; erros: number; log: string }>;
  stopSending: () => void;
  setTemplates: (templates: any[]) => void;
  setContatos: (contatos: any[]) => void;
}

export const useDisparadorStore = create<DisparadorState>((set, get) => ({
  instances: [],
  qrCode: null,
  qrInstance: null,
  qrCountdown: 0,
  isLoading: false,
  contatos: [],
  interromper: false,
  templates: [],

  // New: Reset QR state (call on route change or init)
  resetQr: () => {
    set({ qrCode: null, qrInstance: null, qrCountdown: 0 });
  },

  loadInstances: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(URL_BUSCA_INSTANCIAS);
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
    // Only fetch if not already loading QR
    if (get().qrInstance === instanceName && get().qrCode) return;
    
    set({ qrCode: null, qrInstance: instanceName, qrCountdown: 30 });
    try {
      const response = await fetch(`${URL_QR_CODE}?instanceName=${instanceName}`);
      if (!response.ok) throw new Error("Falha ao gerar QR Code.");
      const data = await response.json();
      if (data.code) {
        set({ qrCode: `data:image/png;base64,${data.code}` });
        // Countdown logic (simplified; use useEffect in component for interval)
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
      // Parse file using xlsx (logic from original JS)
      const buf = await file.arrayBuffer();
      const wb = (window as any).XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const arr = (window as any).XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const header = arr.shift().map((h: string) => String(h).trim());
      const rows = arr as any[];
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
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
      const response = await fetch(URL_FILE_UPLOAD, {
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
    const { contatos, instances, tempoMin, tempoMax, usarIA, templates } = params;
    set({ interromper: false });
    let sucessos = 0;
    let erros = 0;
    let log = "";
    const list = contatos.length ? contatos : []; // Assume contatos from textarea if needed
    for (let i = 0; i < list.length; i++) {
      if (get().interromper) {
        log += "⏹️ Interrompido pelo usuário\n";
        break;
      }
      const item = list[i];
      const messages = templates.map((tt: any) => {
        const personalizedText = tt.text.replace(/\{(\w+)\}/g, (_, k) => {
          const full = item[k] || "";
          return tt.text.includes(`{${k.split(" ")[0]}}`) ? full.split(" ")[0] : full;
        });
        return { type: tt.type, text: personalizedText, mediaUrl: tt.mediaUrl };
      });
      const choice = instances[i % instances.length];
      try {
        const res = await fetch(URL_DISPARO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero: item.telefone.replace(/\D/g, ""),
            mensagens: messages,
            tempoMin,
            tempoMax,
            usarIA,
            instancia: choice,
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
      // Progress update via callback or state
      const delay = (Math.random() * (tempoMax - tempoMin) + tempoMin) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
    const finalLog = `RELATÓRIO DE ENVIO\n\nTotal: ${list.length}\nEnviados com sucesso: ${sucessos}\nTotal com erro: ${erros}\n\n--- DETALHES ---\n${log}`;
    // Download log
    const blob = new Blob([finalLog], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "log_disparo.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    showSuccess(get().interromper ? "Envio interrompido!" : "Envio concluído!");
    return { sucessos, erros, log: finalLog };
  },

  stopSending: () => set({ interromper: true }),

  setTemplates: (templates) => set({ templates }),

  setContatos: (contatos) => set({ contatos }),
}));