import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { getEndpoints } from '@/services/api';
import { showError, showSuccess } from '@/utils/toast';
import { useApiSettingsStore } from './apiSettingsStore';

// --- Interfaces de Dados ---
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    templateUsed?: string;
    suggestedActions?: string[];
    feedback?: 'useful' | 'not-useful';
    isExpanded?: boolean; // Para mensagens longas
    isError?: boolean; // Adicionado para mensagens de erro
  };
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  templateUsed?: string; // Qual template rápido iniciou o chat
}

export interface CompanySettings {
  companyName: string;
  marketSegment: string;
  companySize: string;
  brandVoice: string;
  brandPersonality: string;
  preferredLanguage: string;
  mainProducts: string;
  averageTicket: string;
  salesCycle: string;
  seasonality: string;
  mainPersona: string;
  ageRange: string;
  socialClass: string;
  primaryGoal: string;
  secondaryGoals: string[];
  mainCompetitors: string;
  whatsappPreferences: {
    preferredSendTimes: string;
    maxContactFrequency: string;
    mediaTypes: string[];
  };
}

// --- Estado do Store ---
interface CopyAgentState {
  // Chat Management
  chats: ChatSession[];
  currentChatId: string | null;
  isChatLoading: boolean;
  isSendingMessage: boolean;

  // Company Settings
  companySettings: CompanySettings | null;
  isCompanySettingsLoaded: boolean;
  isCompanySettingsModalOpen: boolean;

  // Actions
  loadChats: () => Promise<void>;
  startNewChat: (templateUsed?: string, initialMessageContent?: string) => Promise<void>;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, newName: string) => Promise<void>;
  sendMessage: (messageContent: string, templateUsed?: string) => Promise<void>;
  updateMessageMetadata: (chatId: string, messageId: string, metadata: Partial<Message['metadata']>) => void;
  
  // Company Settings Actions
  loadCompanySettings: () => Promise<void>;
  saveCompanySettings: (settings: CompanySettings) => Promise<void>;
  openCompanySettingsModal: () => void;
  closeCompanySettingsModal: () => void;
}

// --- Funções Auxiliares ---
const USER_ID = 'default-user'; // Conforme o PRD

const fetchFromSupabase = async (endpoint: string, method: string = 'GET', body?: any) => {
  // Esta é uma simulação. Na realidade, você faria chamadas diretas ao Supabase
  // ou a um backend que interage com o Supabase.
  // Para o propósito deste exercício, vamos simular o armazenamento local.
  return new Promise((resolve) => {
    setTimeout(() => {
      if (endpoint.includes('copy_agent_disparador_r7_treinamentos')) {
        let data = JSON.parse(localStorage.getItem('copy_agent_chats') || '[]');
        if (method === 'POST') {
          const newMessage = { ...body, id: uuidv4(), created_at: new Date().toISOString() };
          data.push(newMessage);
          localStorage.setItem('copy_agent_chats', JSON.stringify(data));
          resolve(newMessage);
        } else if (method === 'GET') {
          if (endpoint.includes('DISTINCT chat_id')) {
            const distinctChats = data.reduce((acc: any, msg: any) => {
              if (!acc[msg.chat_id]) {
                acc[msg.chat_id] = { chat_id: msg.chat_id, session_name: msg.session_name || `Chat ${msg.chat_id.substring(0, 4)}`, last_message: msg.created_at };
              } else if (msg.created_at > acc[msg.chat_id].last_message) {
                acc[msg.chat_id].last_message = msg.created_at;
              }
              return acc;
            }, {});
            resolve(Object.values(distinctChats).sort((a: any, b: any) => new Date(b.last_message).getTime() - new Date(a.last_message).getTime()));
          } else if (endpoint.includes('WHERE chat_id =')) {
            const chatId = endpoint.split('=').pop()?.trim().replace(/'/g, '');
            resolve(data.filter((msg: any) => msg.chat_id === chatId).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
          }
        } else if (method === 'PUT') { // Simula update para rename
          data = data.map((msg: any) => msg.chat_id === body.chat_id ? { ...msg, session_name: body.session_name, updated_at: new Date().toISOString() } : msg);
          localStorage.setItem('copy_agent_chats', JSON.stringify(data));
          resolve({ success: true });
        } else if (method === 'DELETE') {
          data = data.filter((msg: any) => msg.chat_id !== body.chat_id);
          localStorage.setItem('copy_agent_chats', JSON.stringify(data));
          resolve({ success: true });
        }
      } else if (endpoint.includes('custom_prompt_disparador_r7_treinamentos')) {
        let settings = JSON.parse(localStorage.getItem('company_settings') || 'null');
        if (method === 'POST') {
          settings = { ...body, user_id: USER_ID, updated_at: new Date().toISOString() };
          localStorage.setItem('company_settings', JSON.stringify(settings));
          resolve(settings);
        } else if (method === 'GET') {
          resolve(settings);
        }
      }
    }, 300);
  });
};

export const useCopyAgentStore = create<CopyAgentState>((set, get) => ({
  // Initial State
  chats: [],
  currentChatId: null,
  isChatLoading: false,
  isSendingMessage: false,
  companySettings: null,
  isCompanySettingsLoaded: false,
  isCompanySettingsModalOpen: false,

  // --- Chat Actions ---
  loadChats: async () => {
    set({ isChatLoading: true });
    try {
      // Simula SELECT DISTINCT chat_id, session_name, MAX(created_at)
      const rawChats: any = await fetchFromSupabase(`copy_agent_disparador_r7_treinamentos?user_id=${USER_ID}&distinct=true`);
      const formattedChats: ChatSession[] = rawChats.map((chat: any) => ({
        id: chat.chat_id,
        name: chat.session_name || `Chat ${chat.chat_id.substring(0, 4)}`,
        createdAt: chat.created_at,
        updatedAt: chat.last_message,
      }));
      set({ chats: formattedChats });
      if (formattedChats.length > 0 && !get().currentChatId) {
        get().selectChat(formattedChats[0].id);
      }
    } catch (error) {
      showError("Erro ao carregar histórico de chats: " + (error as Error).message);
    } finally {
      set({ isChatLoading: false });
    }
  },

  startNewChat: async (templateUsed?: string, initialMessageContent?: string) => {
    const newChatId = uuidv4();
    const newChatName = templateUsed ? templateUsed.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : `Novo Chat ${newChatId.substring(0, 4)}`;
    const now = new Date().toISOString();

    const newChatSession: ChatSession = {
      id: newChatId,
      name: newChatName,
      messages: [],
      createdAt: now,
      updatedAt: now,
      templateUsed: templateUsed,
    };

    set((state) => ({
      chats: [newChatSession, ...state.chats],
      currentChatId: newChatId,
      isChatLoading: false, // New chat is not loading messages initially
    }));

    if (initialMessageContent) {
      await get().sendMessage(initialMessageContent, templateUsed);
    }
  },

  selectChat: async (chatId: string) => {
    set({ currentChatId: chatId, isChatLoading: true });
    try {
      // Simula SELECT message_role, message_content, created_at
      const rawMessages: any = await fetchFromSupabase(`copy_agent_disparador_r7_treinamentos?chat_id='${chatId}'`);
      const formattedMessages: Message[] = rawMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.message_role,
        content: msg.message_content,
        timestamp: msg.created_at,
        metadata: msg.metadata,
      }));
      set((state) => ({
        chats: state.chats.map(chat => chat.id === chatId ? { ...chat, messages: formattedMessages } : chat),
      }));
    } catch (error) {
      showError("Erro ao carregar mensagens do chat: " + (error as Error).message);
    } finally {
      set({ isChatLoading: false });
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      await fetchFromSupabase('copy_agent_disparador_r7_treinamentos', 'DELETE', { chat_id: chatId });
      set((state) => {
        const updatedChats = state.chats.filter(chat => chat.id !== chatId);
        let newCurrentChatId = state.currentChatId;
        if (newCurrentChatId === chatId) {
          newCurrentChatId = updatedChats.length > 0 ? updatedChats[0].id : null;
        }
        return {
          chats: updatedChats,
          currentChatId: newCurrentChatId,
        };
      });
      showSuccess("Chat excluído com sucesso!");
      if (get().currentChatId) {
        get().selectChat(get().currentChatId!);
      }
    } catch (error) {
      showError("Erro ao excluir chat: " + (error as Error).message);
    }
  },

  renameChat: async (chatId: string, newName: string) => {
    try {
      // Simula UPDATE session_name
      await fetchFromSupabase('copy_agent_disparador_r7_treinamentos', 'PUT', { chat_id: chatId, session_name: newName });
      set((state) => ({
        chats: state.chats.map(chat => chat.id === chatId ? { ...chat, name: newName, updatedAt: new Date().toISOString() } : chat),
      }));
      showSuccess("Chat renomeado com sucesso!");
    } catch (error) {
      showError("Erro ao renomear chat: " + (error as Error).message);
    }
  },

  sendMessage: async (messageContent: string, templateUsed?: string) => {
    const { currentChatId, companySettings } = get();
    if (!currentChatId) {
      showError("Nenhum chat selecionado. Por favor, inicie um novo chat.");
      return;
    }
    if (!companySettings) {
      showError("Por favor, configure as informações da sua empresa antes de usar o Copy Agent.");
      get().openCompanySettingsModal();
      return;
    }

    set({ isSendingMessage: true });
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      metadata: { templateUsed },
    };

    // Add user message to current chat immediately
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, userMessage], updatedAt: new Date().toISOString() }
          : chat
      ),
    }));

    // Save user message to "Supabase" (simulated)
    await fetchFromSupabase('copy_agent_disparador_r7_treinamentos', 'POST', {
      user_id: USER_ID,
      chat_id: currentChatId,
      session_name: get().chats.find(c => c.id === currentChatId)?.name,
      message_role: 'user',
      message_content: messageContent,
      template_used: templateUsed,
      metadata: {},
    });

    try {
      const endpoints = useApiSettingsStore.getState().endpoints;
      const currentChat = get().chats.find(chat => chat.id === currentChatId);
      const chatHistory = currentChat?.messages.map(msg => ({ role: msg.role, content: msg.content })) || [];

      const payload = {
        chat_id: currentChatId,
        user_id: USER_ID,
        current_message: messageContent,
        template_used: templateUsed,
        company_context: companySettings,
        chat_history: chatHistory, // Envia o histórico completo
      };

      const response = await fetch(endpoints.COPY_AGENT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao se comunicar com o Copy Agent.");
      }

      const result = await response.json();
      const aiMessageContent = result.response || "Desculpe, não consegui gerar uma resposta.";
      const aiMessageMetadata = result.metadata || {};

      const aiMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiMessageContent,
        timestamp: new Date().toISOString(),
        metadata: aiMessageMetadata,
      };

      // Add AI message to current chat
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, aiMessage], updatedAt: new Date().toISOString() }
            : chat
        ),
      }));

      // Save AI message to "Supabase" (simulated)
      await fetchFromSupabase('copy_agent_disparador_r7_treinamentos', 'POST', {
        user_id: USER_ID,
        chat_id: currentChatId,
        session_name: get().chats.find(c => c.id === currentChatId)?.name,
        message_role: 'assistant',
        message_content: aiMessageContent,
        metadata: aiMessageMetadata,
      });

    } catch (error) {
      showError("Erro ao enviar mensagem: " + (error as Error).message);
      // Optionally, add an error message bubble to the chat
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Ocorreu um erro: ${(error as Error).message}. Por favor, tente novamente.`,
        timestamp: new Date().toISOString(),
        metadata: { isError: true },
      };
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, errorMessage], updatedAt: new Date().toISOString() }
            : chat
        ),
      }));
    } finally {
      set({ isSendingMessage: false });
    }
  },

  updateMessageMetadata: (chatId: string, messageId: string, metadata: Partial<Message['metadata']>) => {
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map(msg =>
                msg.id === messageId ? { ...msg, metadata: { ...msg.metadata, ...metadata } } : msg
              ),
            }
          : chat
      ),
    }));
    // In a real app, you'd also persist this metadata update to Supabase
  },

  // --- Company Settings Actions ---
  loadCompanySettings: async () => {
    set({ isCompanySettingsLoaded: false });
    try {
      // Simula SELECT * FROM custom_prompt_disparador_r7_treinamentos
      const settings = await fetchFromSupabase(`custom_prompt_disparador_r7_treinamentos?user_id=${USER_ID}`) as CompanySettings | null;
      set({ companySettings: settings, isCompanySettingsLoaded: true });
    } catch (error) {
      showError("Erro ao carregar configurações da empresa: " + (error as Error).message);
      set({ isCompanySettingsLoaded: true }); // Still set to true to avoid infinite loading
    }
  },

  saveCompanySettings: async (settings: CompanySettings) => {
    try {
      // Simula INSERT ... ON CONFLICT DO UPDATE
      await fetchFromSupabase('custom_prompt_disparador_r7_treinamentos', 'POST', settings);
      set({ companySettings: settings, isCompanySettingsModalOpen: false });
      showSuccess("Configurações da empresa salvas com sucesso!");
    } catch (error) {
      showError("Erro ao salvar configurações da empresa: " + (error as Error).message);
    }
  },

  openCompanySettingsModal: () => set({ isCompanySettingsModalOpen: true }),
  closeCompanySettingsModal: () => set({ isCompanySettingsModalOpen: false }),
}));