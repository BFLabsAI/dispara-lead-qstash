"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDisparadorStore } from "../../store/disparadorStore";
import { showError, showSuccess } from "@/utils/toast";
import { AudienceDefinition } from "./AudienceDefinition";
import { MessageCreator } from "./MessageCreator";
import { PremiumInstanceSelector } from "./PremiumInstanceSelector";
import { FinalReview } from "./FinalReview";

export const ShooterConfig = () => {
  // Estados do componente
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [tempoMin, setTempoMin] = useState<number>(2);
  const [tempoMax, setTempoMax] = useState<number>(5);
  const [usarIA, setUsarIA] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [campaignName, setCampaignName] = useState<string>("");
  const [publicTarget, setPublicTarget] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [templates, setTemplates] = useState<any[]>([{ type: 'texto', text: '', mediaUrl: '' }]);

  // Estados do store
  const { instances, contatos, loadInstances } = useDisparadorStore();

  // Carregar instâncias ao montar o componente
  useState(() => {
    loadInstances();
  });

  const handleSend = async () => {
    if (selectedInstances.length === 0) return showError("Nenhuma instância selecionada.");
    if (contatos.length === 0) return showError("Nenhum contato fornecido.");
    if (tempoMin < 1 || tempoMax < 1 || tempoMax < tempoMin) return showError("Tempos inválidos.");

    setIsSending(true);
    try {
      await useDisparadorStore.getState().sendMessages({ 
        contatos, 
        instances: selectedInstances, 
        tempoMin, 
        tempoMax, 
        usarIA, 
        templates,
        campaignName,
        publicTarget,
        content
      });
      showSuccess("Campanha enviada com sucesso!");
    } catch (error) {
      showError("Erro ao enviar campanha");
    } finally {
      setIsSending(false);
    }
  };

  const summary = {
    contacts: contatos.length,
    instances: selectedInstances.length,
    messages: contatos.length * templates.length
  };

  return (
    <div className="space-y-8">
      {/* Seção 1: Definição do Público */}
      <AudienceDefinition
        campaignName={campaignName}
        setCampaignName={setCampaignName}
        publicTarget={publicTarget}
        setPublicTarget={setPublicTarget}
        content={content}
        setContent={setContent}
        onUpload={(variables) => {}}
      />

      {/* Seção 2: Seleção de Instâncias */}
      <PremiumInstanceSelector
        instances={instances}
        selectedInstances={selectedInstances}
        onSelectionChange={setSelectedInstances}
      />

      {/* Seção 3: Criador de Mensagens */}
      <MessageCreator
        templates={templates}
        setTemplates={setTemplates}
      />

      {/* Seção 4: Revisão Final */}
      <FinalReview
        tempoMin={tempoMin}
        setTempoMin={setTempoMin}
        tempoMax={tempoMax}
        setTempoMax={setTempoMax}
        usarIA={usarIA}
        setUsarIA={setUsarIA}
        onSend={handleSend}
        isSending={isSending}
        summary={summary}
        campaignName={campaignName}
        publicTarget={publicTarget}
        content={content}
      />
    </div>
  );
};