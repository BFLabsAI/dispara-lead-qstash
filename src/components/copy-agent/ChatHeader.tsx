"use client";

import React from 'react';
import { useCopyAgentStore, ChatSession } from '@/store/copyAgentStore';
import { Settings, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  chat: ChatSession | undefined;
}

export const ChatHeader = ({ chat }: ChatHeaderProps) => {
  const { companySettings, openCompanySettingsModal } = useCopyAgentStore();

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold text-primary">🤖 Copy Agent | DisparaLead</h2>
        <p className="text-sm text-muted-foreground">Especialista em WhatsApp Marketing</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Empresa: <span className="font-medium text-foreground">{companySettings?.companyName || "Não Configurada"}</span>
        {companySettings?.companyName ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Button variant="ghost" size="sm" onClick={openCompanySettingsModal} className="text-primary hover:text-primary/80">
            <Settings className="h-4 w-4 mr-1" /> Configurar
          </Button>
        )}
      </div>
    </div>
  );
};