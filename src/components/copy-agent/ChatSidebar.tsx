"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Settings, Search, MessageSquare, Users, DollarSign, Target, Zap, ShoppingCart, CalendarDays, ThumbsUp } from 'lucide-react';
import { useCopyAgentStore } from '@/store/copyAgentStore';
import { CompanySettingsModal } from './CompanySettingsModal';
import { QuickTemplateButton } from './QuickTemplateButton';
import { ChatHistoryItem } from './ChatHistoryItem';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br'; // Importar locale para formatação de data

dayjs.locale('pt-br');

const QUICK_TEMPLATES = [
  { name: 'Negociações Perdidas', icon: DollarSign, prompt: "Crie uma estratégia para reativar negociações perdidas" },
  { name: 'Leads Frios', icon: Users, prompt: "Crie uma sequência para aquecer leads frios" },
  { name: 'Clientes LTV', icon: ThumbsUp, prompt: "Crie estratégias para aumentar LTV dos clientes" },
  { name: 'Outbound Frio', icon: Target, prompt: "Crie uma sequência de outbound frio" },
  { name: 'Reativação Black Friday', icon: Zap, prompt: "Crie uma campanha de Black Friday para reativar clientes inativos" },
  { name: 'Recuperação Carrinho', icon: ShoppingCart, prompt: "Crie uma sequência para recuperar carrinhos abandonados" },
  { name: 'Agendamento Reunião', icon: CalendarDays, prompt: "Crie uma estratégia para agendar reuniões com prospects" },
  { name: 'Promoção Sazonal', icon: CalendarDays, prompt: "Crie uma campanha sazonal" },
];

export const ChatSidebar = () => {
  const {
    chats,
    currentChatId,
    isChatLoading,
    loadChats,
    startNewChat,
    selectChat,
    deleteChat,
    renameChat,
    openCompanySettingsModal,
    isCompanySettingsModalOpen,
  } = useCopyAgentStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleNewChat = async (templateUsed?: string, initialMessageContent?: string) => {
    await startNewChat(templateUsed, initialMessageContent);
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupChatsByDate = (chatList: typeof chats) => {
    const grouped: { [key: string]: typeof chats } = {};
    chatList.forEach(chat => {
      const chatDate = dayjs(chat.updatedAt);
      let groupKey: string;
      if (chatDate.isSame(dayjs(), 'day')) {
        groupKey = 'Hoje';
      } else if (chatDate.isSame(dayjs().subtract(1, 'day'), 'day')) {
        groupKey = 'Ontem';
      } else if (chatDate.isSame(dayjs(), 'week')) {
        groupKey = 'Esta Semana';
      } else {
        groupKey = chatDate.format('MMMM [de] YYYY');
      }
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(chat);
    });
    return grouped;
  };

  const groupedChats = groupChatsByDate(filteredChats);

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Seção Superior */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> COPY AGENT
        </h2>
        <Button onClick={() => handleNewChat()} className="w-full btn-premium">
          <Plus className="mr-2 h-4 w-4" /> Novo Chat
        </Button>
        <Button variant="outline" onClick={openCompanySettingsModal} className="w-full">
          <Settings className="mr-2 h-4 w-4" /> Configurar Empresa
        </Button>
      </div>

      {/* Templates Rápidos */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Campanhas Prontas</h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TEMPLATES.map((template) => (
            <QuickTemplateButton
              key={template.name}
              name={template.name}
              icon={template.icon}
              onClick={() => handleNewChat(template.name, template.prompt)}
            />
          ))}
        </div>
      </div>

      {/* Histórico de Conversas */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Histórico</h3>
        <div className="relative mb-2"> {/* Wrapper div for input and icon */}
          <Input
            placeholder="Buscar no histórico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8" // Add padding to the right for the icon
          />
          <Search className="h-4 w-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2" />
        </div>
        <ScrollArea className="flex-1 pr-2">
          {isChatLoading ? (
            <div className="text-center text-muted-foreground">Carregando chats...</div>
          ) : (
            Object.keys(groupedChats).length > 0 ? (
              Object.entries(groupedChats).map(([group, chatsInGroup]) => (
                <div key={group} className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">{group}</h4>
                  <div className="space-y-1">
                    {chatsInGroup.map((chat) => (
                      <ChatHistoryItem
                        key={chat.id}
                        chat={chat}
                        isSelected={chat.id === currentChatId}
                        onSelect={selectChat}
                        onDelete={deleteChat}
                        onRename={renameChat}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground">Nenhum chat encontrado.</div>
            )
          )}
        </ScrollArea>
      </div>

      <CompanySettingsModal isOpen={isCompanySettingsModalOpen} />
    </div>
  );
};