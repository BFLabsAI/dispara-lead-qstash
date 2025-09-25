"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings, MessageSquare } from 'lucide-react';

interface ChatSidebarHeaderProps {
  onNewChat: () => void;
  onOpenCompanySettings: () => void;
}

export const ChatSidebarHeader = ({ onNewChat, onOpenCompanySettings }: ChatSidebarHeaderProps) => {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold text-primary flex items-center gap-2">
        <MessageSquare className="h-6 w-6" /> COPY AGENT
      </h2>
      <Button onClick={onNewChat} className="w-full btn-premium">
        <Plus className="mr-2 h-4 w-4" /> Novo Chat
      </Button>
      <Button variant="outline" onClick={onOpenCompanySettings} className="w-full">
        <Settings className="mr-2 h-4 w-4" /> Configurar Empresa
      </Button>
    </div>
  );
};