"use client";

import React, { useState } from 'react';
import { Message } from '@/store/copyAgentStore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Copy, RefreshCw, Save, Share2, Bot, User, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
  onFeedback: (feedback: 'useful' | 'not-useful') => void;
  onToggleExpand: (isExpanded: boolean) => void;
}

const MAX_CONTENT_LENGTH = 500; // Increased limit for better readability before folding

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setIsCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className={cn("bg-muted px-1.5 py-0.5 rounded-md font-mono text-sm", className)} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border/50 bg-muted/40">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {match ? match[1] : 'Texto'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          title="Copiar código"
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="p-4">
        <code className={cn("font-mono text-sm whitespace-pre-wrap break-words", className)} {...props}>
          {children}
        </code>
      </div>
    </div>
  );
};

export const MessageBubble = ({ message, onFeedback, onToggleExpand }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isExpanded = message.metadata?.isExpanded || false;
  // If user message, typically we don't truncate, only AI responses if very long.
  // But let's keep logic general or specific:
  const shouldTruncate = !isUser && message.content.length > MAX_CONTENT_LENGTH;

  const displayedContent = shouldTruncate && !isExpanded
    ? `${message.content.substring(0, MAX_CONTENT_LENGTH)}...`
    : message.content;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Mensagem copiada para a área de transferência!");
  };

  return (
    <div className={cn("flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 mt-1 border border-border shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/30 text-primary">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col max-w-[85%] md:max-w-[75%]")}>
        <div
          className={cn(
            "p-4 rounded-2xl shadow-sm text-sm overflow-hidden relative",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card text-card-foreground rounded-bl-sm border border-border/50 hover:border-border transition-colors"
          )}
        >
          {isUser ? (
            // User messages are simpler, usually plain text, but whitespace matters
            <div className="whitespace-pre-wrap font-sans">{message.content}</div>
          ) : (
            // AI messages get the full Markdown treatment
            <div className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              // Customizing prose for better density and look
              "prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50",
              "prose-headings:font-semibold prose-headings:tracking-tight",
              "prose-ul:my-2 prose-li:my-0.5",
              "prose-strong:text-foreground/90 prose-strong:font-bold",
              "prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0" // Reset pre styles as we handle container in CodeBlock
            )}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Optional: Customize specific elements if needed
                  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" />,
                  code: CodeBlock
                }}
              >
                {displayedContent}
              </ReactMarkdown>
            </div>
          )}

          {shouldTruncate && (
            <div className={cn("absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent", isExpanded && "hidden")} />
          )}
        </div>

        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand(!isExpanded)}
            className="self-start mt-1 h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            {isExpanded ? <><ChevronUp className="h-3 w-3" /> Mostrar menos</> : <><ChevronDown className="h-3 w-3" /> Ler tudo</>}
          </Button>
        )}

        <div className={cn(
          "flex items-center gap-2 mt-1 px-1 text-[11px] text-muted-foreground/60 transition-opacity",
          isUser ? "justify-end text-primary-foreground/70" : "justify-start opacity-0 group-hover:opacity-100"
        )}>
          <span>{format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}</span>
          {!isUser && (
            <div className="flex items-center gap-0.5 ml-2 border-l border-border/40 pl-2">
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-green-500 hover:bg-green-500/10" onClick={() => onFeedback('useful')} title="Útil">
                <ThumbsUp className={cn("h-3 w-3", message.metadata?.feedback === 'useful' && "fill-current text-green-500")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-red-500 hover:bg-red-500/10" onClick={() => onFeedback('not-useful')} title="Não Útil">
                <ThumbsDown className={cn("h-3 w-3", message.metadata?.feedback === 'not-useful' && "fill-current text-red-500")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-foreground hover:bg-primary/10" onClick={handleCopy} title="Copiar Texto">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-foreground hover:bg-primary/10" title="Regenerar Resposta">
                <RefreshCw className="h-3 w-3" />
              </Button>

            </div>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 mt-1 border border-primary/20 shadow-sm">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};