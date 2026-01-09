"use client";

import React, { useState } from 'react';
import { QuickTemplateButton } from './QuickTemplateButton';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AGENT_TEMPLATES } from '@/constants/agentTemplates';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface QuickTemplatesSectionProps {
  onNewChat: (templateUsed?: string, initialMessageContent?: string) => Promise<void>;
}

export const QuickTemplatesSection = ({ onNewChat }: QuickTemplatesSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Campanhas Prontas</h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0 hover:bg-transparent">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="space-y-2">
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
      </CollapsibleContent>
    </Collapsible>
  );
};