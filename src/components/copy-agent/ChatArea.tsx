"use client";

import React, { useEffect, useRef } from 'react';
import { useCopyAgentStore } from '@/store/copyAgentStore';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

export const ChatArea = () => {
  const { chats, currentChatId, isChatLoading, isSendingMessage, updateMessageMetadata } = useCopyAgentStore();
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  if (!currentChatId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        <h3 className="text-xl font-semibold mb-2">Selecione um chat</h3>
        <p>Ou inicie um novo para começar a conversar com o Copy Agent.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader chat={currentChat} />

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-16 p-4">
          {isChatLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            currentChat?.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onFeedback={(feedback) => updateMessageMetadata(currentChat.id, message.id, { feedback })}
                onToggleExpand={(isExpanded) => updateMessageMetadata(currentChat.id, message.id, { isExpanded })}
              />
            ))
          )}
          {isSendingMessage && (
            <div className="flex justify-start">
              <div className="bg-muted p-3 rounded-lg max-w-[70%] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">IA está digitando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <ChatInput />
    </div>
  );
};