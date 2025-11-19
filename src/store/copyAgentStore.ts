import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { getEndpoints } from '@/services/api';
import { showError, showSuccess } from '@/utils/toast';
import { useApiSettingsStore } from './apiSettingsStore';
import { supabase } from '@/services/supabaseClient';
import { sendMessageToOpenRouter, OpenRouterMessage, AVAILABLE_MODELS } from '@/services/openRouterApi';

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
    model?: string; // Adicionado para rastrear o modelo usado
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
  selectedModel: string; // New: Selected AI Model

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
  setSelectedModel: (modelId: string) => void; // New Action

  // Company Settings Actions
  loadCompanySettings: () => Promise<void>;
  saveCompanySettings: (settings: CompanySettings) => Promise<void>;
  openCompanySettingsModal: () => void;
  closeCompanySettingsModal: () => void;
}

// --- Funções Auxiliares ---
const USER_ID = 'default-user'; // Conforme o PRD

// Helper to construct system prompt
const buildSystemPrompt = (settings: CompanySettings | null): string => {
  if (!settings) {
    return `Você é um especialista em Copywriting para WhatsApp Marketing.
    
    DIRETRIZES DE WHATSAPP:
    - Use emojis moderadamente.
    - Mantenha mensagens curtas e diretas (ideais para leitura rápida).
    - Use quebras de linha para facilitar a leitura.
    - Evite linguagem muito formal, prefira um tom conversacional e próximo.
    - Foco em conversão e engajamento.
    
    Sua tarefa é ajudar o usuário a criar textos (copies) persuasivos para campanhas de WhatsApp, responder dúvidas sobre estratégia de marketing e sugerir melhorias.`;
  }

  return `Você é um especialista em Copywriting para WhatsApp Marketing, trabalhando para a empresa ${settings.companyName}.
  
  CONTEXTO DA EMPRESA:
  - Segmento: ${settings.marketSegment}
  - Tamanho: ${settings.companySize}
  - Produtos Principais: ${settings.mainProducts}
  - Ticket Médio: ${settings.averageTicket}
  - Público Alvo: ${settings.mainPersona} (Idade: ${settings.ageRange}, Classe: ${settings.socialClass})
  - Voz da Marca: ${settings.brandVoice}
  - Personalidade: ${settings.brandPersonality}
  - Objetivo Principal: ${settings.primaryGoal}
  
  DIRETRIZES DE WHATSAPP:
  - Use emojis moderadamente.
  - Mantenha mensagens curtas e diretas (ideais para leitura rápida).
  - Use quebras de linha para facilitar a leitura.
  - Evite linguagem muito formal, prefira um tom conversacional e próximo.
  - Foco em conversão e engajamento.
  
  Sua tarefa é ajudar o usuário a criar textos (copies) persuasivos para campanhas de WhatsApp, responder dúvidas sobre estratégia de marketing e sugerir melhorias.
  `;
};

export const useCopyAgentStore = create<CopyAgentState>((set, get) => ({
  // Initial State
  chats: [],
  currentChatId: null,
  isChatLoading: false,
  isSendingMessage: false,
  selectedModel: AVAILABLE_MODELS[0].id, // Default to first model
  companySettings: null,
  isCompanySettingsLoaded: false,
  isCompanySettingsModalOpen: false,

  // --- Chat Actions ---
  loadChats: async () => {
    set({ isChatLoading: true });
    try {
      // Fetch unique chat sessions
      const { data, error } = await supabase
        .from('copy_agent_disparador_r7_treinamentos')
        .select('chat_id, session_name, created_at')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const chatMap = new Map<string, ChatSession>();

      data?.forEach((msg: any) => {
        if (!chatMap.has(msg.chat_id)) {
          chatMap.set(msg.chat_id, {
            id: msg.chat_id,
            name: msg.session_name || `Chat ${msg.chat_id.substring(0, 4)}`,
            messages: [], // We don't load messages here to save bandwidth
            createdAt: msg.created_at,
            updatedAt: msg.created_at, // This should ideally be the max created_at of messages
          });
        }
      });

      const formattedChats = Array.from(chatMap.values());
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
      const { data, error } = await supabase
        .from('copy_agent_disparador_r7_treinamentos')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id || uuidv4(), // Fallback if ID is missing
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
      const { error } = await supabase
        .from('copy_agent_disparador_r7_treinamentos')
        .delete()
        .eq('chat_id', chatId);

      if (error) throw error;

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
      // Update all messages in the chat with the new session name
      const { error } = await supabase
        .from('copy_agent_disparador_r7_treinamentos')
        .update({ session_name: newName })
        .eq('chat_id', chatId);

      if (error) throw error;

      set((state) => ({
        chats: state.chats.map(chat => chat.id === chatId ? { ...chat, name: newName, updatedAt: new Date().toISOString() } : chat),
      }));
      showSuccess("Chat renomeado com sucesso!");
    } catch (error) {
      showError("Erro ao renomear chat: " + (error as Error).message);
    }
  },

  setSelectedModel: (modelId: string) => {
    set({ selectedModel: modelId });
  },

  sendMessage: async (messageContent: string, templateUsed?: string) => {
    const { currentChatId, companySettings, selectedModel } = get();
    if (!currentChatId) {
      showError("Nenhum chat selecionado. Por favor, inicie um novo chat.");
      return;
    }
    // Removed blocking check for companySettings

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

    try {
      // 1. Save user message to Copy Agent table
      await supabase.from('copy_agent_disparador_r7_treinamentos').insert({
        user_id: USER_ID,
        chat_id: currentChatId,
        session_name: get().chats.find(c => c.id === currentChatId)?.name,
        message_role: 'user',
        message_content: messageContent,
        template_used: templateUsed,
        metadata: {},
      });

      // 2. Call OpenRouter API
      const currentChat = get().chats.find(chat => chat.id === currentChatId);
      const chatHistory = currentChat?.messages.map(msg => ({ role: msg.role, content: msg.content })) || [];

      // Construct messages array for OpenRouter
      const systemPrompt = buildSystemPrompt(companySettings);
      const messages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
        // The current message is already in chatHistory because we added it to state above? 
        // Wait, we added it to state, but `currentChat` reference might be stale if we didn't get it fresh.
        // `get().chats` gets the fresh state.
        // However, let's be safe. `chatHistory` comes from `currentChat` which comes from `get().chats`.
        // Since we did `set(...)` before, `get()` should return the updated state with the new message.
      ];

      const aiMessageContent = await sendMessageToOpenRouter(messages, selectedModel);
      const aiMessageMetadata = { model: selectedModel };

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

      // 3. Save AI message to Copy Agent table
      await supabase.from('copy_agent_disparador_r7_treinamentos').insert({
        user_id: USER_ID,
        chat_id: currentChatId,
        session_name: get().chats.find(c => c.id === currentChatId)?.name,
        message_role: 'assistant',
        message_content: aiMessageContent,
        metadata: aiMessageMetadata,
      });

      // 4. Log to Main Dashboard Table
      await supabase.from('disparador_r7_treinamentos').insert({
        numero: 'CopyAgent',
        tipo_envio: 'sucesso',
        usaria: true,
        instancia: 'CopyAgent',
        texto: aiMessageContent,
        nome_campanha: 'Copy Agent Chat',
        publico: 'Individual',
        criativo: 'AI Generated',
        tipo_campanha: 'Copy Agent'
      });

    } catch (error) {
      showError("Erro ao enviar mensagem: " + (error as Error).message);
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
  },

  // --- Company Settings Actions ---
  loadCompanySettings: async () => {
    set({ isCompanySettingsLoaded: false });
    try {
      const { data, error } = await supabase
        .from('custom_prompt_disparador_r7_treinamentos')
        .select('*')
        .eq('user_id', USER_ID)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore not found error

      set({ companySettings: data as CompanySettings | null, isCompanySettingsLoaded: true });
    } catch (error) {
      showError("Erro ao carregar configurações da empresa: " + (error as Error).message);
      set({ isCompanySettingsLoaded: true });
    }
  },

  saveCompanySettings: async (settings: CompanySettings) => {
    try {
      const { error } = await supabase
        .from('custom_prompt_disparador_r7_treinamentos')
        .upsert({ ...settings, user_id: USER_ID, updated_at: new Date().toISOString() });

      if (error) throw error;

      set({ companySettings: settings, isCompanySettingsModalOpen: false });
      showSuccess("Configurações da empresa salvas com sucesso!");
    } catch (error) {
      showError("Erro ao salvar configurações da empresa: " + (error as Error).message);
    }
  },

  openCompanySettingsModal: () => set({ isCompanySettingsModalOpen: true }),
  closeCompanySettingsModal: () => set({ isCompanySettingsModalOpen: false }),
}));