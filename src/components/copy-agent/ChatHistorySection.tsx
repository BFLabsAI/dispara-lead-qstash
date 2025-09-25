"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { ChatHistoryItem } from './ChatHistoryItem';
import { ChatSession } from '@/store/copyAgentStore';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

interface ChatHistorySectionProps {
  chats: ChatSession[];
  currentChatId: string | null;
  isChatLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newName: string) => void;
}

const groupChatsByDate = (chatList: ChatSession[]) => {
  const grouped: { [key: string]: ChatSession[] } = {};
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

export const ChatHistorySection = ({
  chats,
  currentChatId,
  isChatLoading,
  searchTerm,
  onSearchChange,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
}: ChatHistorySectionProps) => {
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const groupedChats = groupChatsByDate(filteredChats);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase">Histórico</h3>
      <div className="relative mb-2">
        <Input
          placeholder="Buscar no histórico..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-8"
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
                      onSelect={onSelectChat}
                      onDelete={onDeleteChat}
                      onRename={onRenameChat}
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
  );
};