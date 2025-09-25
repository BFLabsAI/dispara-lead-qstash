"use client";

import React from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { cn } from '@/lib/utils';
import { useCopyAgentStore } from '@/store/copyAgentStore';

export const CopyAgentLayout = () => {
  const { currentChatId } = useCopyAgentStore();

  return (
    <div className="flex h-full rounded-xl overflow-hidden border border-border bg-card shadow-lg">
      {/* Sidebar */}
      <div className="w-[300px] flex-shrink-0 border-r border-border bg-sidebar dark:bg-gray-900">
        <ChatSidebar />
      </div>

      {/* Main Chat Area */}
      <div className={cn("flex-1 flex flex-col", !currentChatId && "items-center justify-center text-muted-foreground")}>
        {currentChatId ? (
          <ChatArea />
        ) : (
          <div className="text-center p-8">
            <h3 className="text-xl font-semibold mb-2">Bem-vindo ao Copy Agent!</h3>
            <p>Selecione um chat existente ou inicie um novo para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
};