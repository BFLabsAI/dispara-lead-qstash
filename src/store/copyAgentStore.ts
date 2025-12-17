import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { showError, showSuccess } from '@/utils/toast';
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
        .from('chat_sessions_dispara_lead_saas_02')
        .select('id, session_name, created_at')
        // .eq('user_id', USER_ID) // RLS handles this now via tenant/user check
        .order('created_at', { ascending: false });

      if (error) throw error;

      const chatMap = new Map<string, ChatSession>();

      data?.forEach((msg: any) => {
        if (!chatMap.has(msg.id)) {
          chatMap.set(msg.id, {
            id: msg.id,
            name: msg.session_name || `Chat ${msg.id.substring(0, 4)}`,
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

    // Create session in DB immediately
    try {
      const { error } = await supabase.from('chat_sessions_dispara_lead_saas_02').insert({
        id: newChatId,
        session_name: newChatName,
        template_used: templateUsed,
        // tenant_id is handled by RLS default or trigger, but we might need to fetch it if not auto-set.
        // For now assuming RLS/Trigger handles it or we need to pass it.
        // Actually, RLS usually restricts access, it doesn't auto-insert tenant_id unless we have a default value or trigger.
        // We should probably fetch the user's tenant_id first or rely on a database trigger.
        // Let's assume for now we need to get the current user's tenant.
      });
      if (error) throw error;
    } catch (e) {
      console.error("Error creating chat session", e);
      // Continue locally for now? No, better to fail.
    }

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
        .from('chat_messages_dispara_lead_saas_02')
        .select('*')
        .eq('session_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id || uuidv4(), // Fallback if ID is missing
        role: msg.role,
        content: msg.content,
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
        .from('chat_sessions_dispara_lead_saas_02')
        .delete()
        .eq('id', chatId);

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
        .from('chat_sessions_dispara_lead_saas_02')
        .update({ session_name: newName })
        .eq('id', chatId);

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
      await supabase.from('chat_messages_dispara_lead_saas_02').insert({
        session_id: currentChatId,
        role: 'user',
        content: messageContent,
        metadata: { templateUsed },
      });

      // 2. Call OpenRouter API
      const currentChat = get().chats.find(chat => chat.id === currentChatId);
      const chatHistory = currentChat?.messages.map(msg => ({ role: msg.role, content: msg.content })) || [];

      // Construct messages array for OpenRouter
      const systemPrompt = buildSystemPrompt(companySettings);
      const messages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
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
      await supabase.from('chat_messages_dispara_lead_saas_02').insert({
        session_id: currentChatId,
        role: 'assistant',
        content: aiMessageContent,
        metadata: aiMessageMetadata,
      });

      // 4. Log to Main Dashboard Table
      // We need to fetch the tenant_id for the log. 
      // Ideally we have it in the store or session.
      // For now, we rely on the backend trigger or we need to fetch it.
      // Let's assume we can insert and RLS will check, but we need tenant_id for the log table if it's not defaulted.
      // Actually, let's fetch the user profile first to get tenant_id.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users_dispara_lead_saas_02').select('tenant_id').eq('id', user.id).single();

        if (profile) {
          await supabase.from('message_logs_dispara_lead_saas_03').insert({
            tenant_id: profile.tenant_id,
            status: 'sent',
            instance_name: 'CopyAgent',
            message_content: aiMessageContent,
            campaign_name: 'Copy Agent Chat',
            campaign_type: 'copy_agent',
            metadata: {
              publico: 'Individual',
              criativo: 'AI Generated'
            }
          });
        }
      }

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
      const { data: resultData, error } = await supabase
        .from('company_settings_dispara_lead_saas_02')
        .select('*')
        .limit(1);

      if (error) throw error;

      const data = resultData?.[0];

      if (!data) {
        set({ companySettings: null, isCompanySettingsLoaded: true });
        return;
      }

      // Map DB (snake_case) to App (camelCase)
      const settings: CompanySettings = {
        companyName: data.company_name || "",
        marketSegment: data.market_segment || "",
        companySize: data.company_size || "",
        brandVoice: data.brand_voice || "",
        brandPersonality: data.brand_personality || "",
        preferredLanguage: data.preferred_language || "",
        mainProducts: data.main_products || "",
        averageTicket: data.average_ticket || "",
        salesCycle: data.sales_cycle || "",
        seasonality: data.seasonality || "",
        mainPersona: data.main_persona || "",
        ageRange: data.age_range || "",
        socialClass: data.social_class || "",
        primaryGoal: data.primary_goal || "",
        secondaryGoals: data.secondary_goals || [],
        mainCompetitors: data.main_competitors || "",
        whatsappPreferences: data.whatsapp_guidelines || {
          preferredSendTimes: "",
          maxContactFrequency: "",
          mediaTypes: []
        }
      };

      set({ companySettings: settings, isCompanySettingsLoaded: true });
    } catch (error) {
      showError("Erro ao carregar configurações da empresa: " + (error as Error).message);
      set({ isCompanySettingsLoaded: true });
    }
  },

  saveCompanySettings: async (settings: CompanySettings) => {
    try {
      // First, get the tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase.from('users_dispara_lead_saas_02').select('tenant_id').eq('id', user.id).single();
      if (!profile) throw new Error("User profile not found");

      // Map App (camelCase) to DB (snake_case)
      const dbData = {
        tenant_id: profile.tenant_id,
        company_name: settings.companyName,
        market_segment: settings.marketSegment,
        company_size: settings.companySize,
        brand_voice: settings.brandVoice,
        brand_personality: settings.brandPersonality,
        preferred_language: settings.preferredLanguage,
        main_products: settings.mainProducts,
        average_ticket: settings.averageTicket,
        sales_cycle: settings.salesCycle,
        seasonality: settings.seasonality,
        main_persona: settings.mainPersona,
        age_range: settings.ageRange,
        social_class: settings.socialClass,
        primary_goal: settings.primaryGoal,
        secondary_goals: settings.secondaryGoals,
        main_competitors: settings.mainCompetitors,
        whatsapp_guidelines: settings.whatsappPreferences,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('company_settings_dispara_lead_saas_02')
        .upsert(dbData, { onConflict: 'tenant_id' });

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