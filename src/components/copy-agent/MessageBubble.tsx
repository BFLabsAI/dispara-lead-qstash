"use client";

import React, { useState } from 'react';
import { Message } from '@/store/copyAgentStore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Copy, RefreshCw, Save, Share2, Bot, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  onFeedback: (feedback: 'useful' | 'not-useful') => void;
  onToggleExpand: (isExpanded: boolean) => void;
}

const MAX_CONTENT_LENGTH = 300; // Limite para expandir/recolher

export const MessageBubble = ({ message, onFeedback, onToggleExpand }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isExpanded = message.metadata?.isExpanded || false;
  const hasLongContent = message.content.length > MAX_CONTENT_LENGTH;
  const displayedContent = hasLongContent && !isExpanded ? `${message.content.substring(0, MAX_CONTENT_LENGTH)}...` : message.content;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Mensagem copiada para a área de transferência!");
  };

  const formatContent = (text: string) => {
    // Substitui **texto** por <strong>texto</strong>
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Substitui *texto* por <em>texto</em>
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Substitui - item por <li>item</li>
    formattedText = formattedText.replace(/^- (.*)$/gm, '<li>$1</li>');
    // Envolve listas em <ul>
    if (formattedText.includes('<li>')) {
      formattedText = `<ul>${formattedText}</ul>`;
    }
    return formattedText;
  };

  return (
    <div className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "flex flex-col p-3 rounded-lg max-w-[70%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-foreground rounded-bl-none border border-border"
        )}
      >
        <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatContent(displayedContent) }} />
        {hasLongContent && (
          <Button variant="link" size="sm" onClick={() => onToggleExpand(!isExpanded)} className="p-0 h-auto text-xs mt-2 self-start">
            {isExpanded ? "Recolher" : "Expandir"}
          </Button>
        )}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}</span>
          {!isUser && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => onFeedback('useful')} title="Útil">
                <ThumbsUp className={cn("h-3 w-3", message.metadata?.feedback === 'useful' && "text-green-500")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onFeedback('not-useful')} title="Não Útil">
                <ThumbsDown className={cn("h-3 w-3", message.metadata?.feedback === 'not-useful' && "text-red-500")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleCopy} title="Copiar">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Regenerar">
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Salvar como Template">
                <Save className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Exportar/Compartilhar">
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};