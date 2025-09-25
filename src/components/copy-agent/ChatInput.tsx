"use client";

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Lightbulb } from 'lucide-react';
import { useCopyAgentStore } from '@/store/copyAgentStore';
import { cn } from '@/lib/utils';

const TIPS = [
  "Crie uma sequência para leads frios",
  "Como reativar clientes inativos há 6 meses?",
  "Estratégia para aumentar LTV",
  "Sugira 3 variações para a mensagem acima",
  "Qual o melhor horário para enviar promoções de Black Friday?",
];

export const ChatInput = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, isSendingMessage } = useCopyAgentStore();

  const handleSendMessage = async () => {
    if (message.trim() && !isSendingMessage) {
      await sendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0 z-10">
      <div className="relative flex items-center">
        <Textarea
          placeholder="💬 Digite sua solicitação..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[40px] pr-12 resize-none"
          rows={1}
          disabled={isSendingMessage}
        />
        <Button
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleSendMessage}
          disabled={!message.trim() || isSendingMessage}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Enviar</span>
        </Button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
        <Lightbulb className="h-3 w-3" />
        <span className="font-semibold">Dicas:</span>
        <div className="flex flex-wrap gap-1">
          {TIPS.map((tip, index) => (
            <span key={index} className="px-2 py-0.5 rounded-full bg-muted/50 border border-border cursor-pointer hover:bg-muted" onClick={() => setMessage(tip)}>
              {tip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};