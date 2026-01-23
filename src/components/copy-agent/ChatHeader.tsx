import React from 'react';
import { useCopyAgentStore, ChatSession } from '@/store/copyAgentStore';
import { Settings, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_MODELS } from '@/services/openRouterApi';

interface ChatHeaderProps {
  chat: ChatSession | undefined;
}

export const ChatHeader = ({ chat }: ChatHeaderProps) => {
  const { companySettings, openCompanySettingsModal, selectedModel, setSelectedModel, clearSelection } = useCopyAgentStore();

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 -ml-2 mr-1" onClick={clearSelection}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-primary">🤖 Copy Agent | DisparaLead</h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Especialista em WhatsApp Marketing</p>
          <span className="text-muted-foreground">•</span>
          <div className="w-[200px]">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-xs">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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