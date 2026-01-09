"use client";

import React from 'react';
import { QuickTemplateButton } from './QuickTemplateButton';
import { Users, DollarSign, Target, Zap, ShoppingCart, CalendarDays, ThumbsUp } from 'lucide-react';

interface QuickTemplatesSectionProps {
  onNewChat: (templateUsed?: string, initialMessageContent?: string) => Promise<void>;
}

import { AGENT_TEMPLATES } from '@/constants/agentTemplates';

interface QuickTemplatesSectionProps {
  onNewChat: (templateUsed?: string, initialMessageContent?: string) => Promise<void>;
}

export const QuickTemplatesSection = ({ onNewChat }: QuickTemplatesSectionProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase">Campanhas Prontas</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(AGENT_TEMPLATES).map(([key, template]) => (
          <QuickTemplateButton
            key={key}
            name={template.name}
            icon={template.icon}
            onClick={() => onNewChat(key, `Quero iniciar uma campanha de ${template.name}.`)}
          />
        ))}
      </div>
    </div>
  );
};