"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showError } from "@/utils/toast";
import { useDisparadorStore } from "../../store/disparadorStore";
import { QrDialog } from "./QrDialog";
import { ErrorDialog } from "./ErrorDialog";
import { SectionHeader } from "./SectionHeader";
import { PremiumInstanceSelector } from "./PremiumInstanceSelector";
import { AudienceDefinition } from "./AudienceDefinition";
import { MessageCreator } from "./MessageCreator";
import { FinalReview } from "./FinalReview";
import { Server, Users, MessageSquare, Settings } from "lucide-react";

export const ShooterConfig = () => {
  // State
  const [campaignName, setCampaignName] = useState("");
  const [publicTarget, setPublicTarget] = useState("");
  const [content, setContent] = useState("");
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([{ type: 'texto', text: '', mediaUrl: '' }]);
  const [tempoMin, setTempoMin] = useState(2);
  const [tempoMax, setTempoMax] = useState(5);
  const [usarIA, setUsarIA] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Store
  const { instances, contatos, sendMessages, loadInstances } = useDisparadorStore();

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleSend = async () => {
    if (selectedInstances.length === 0) return showError("Nenhuma instância selecionada.");
    if (contatos.length === 0) return showError("Nenhum contato fornecido.");
    if (tempoMin < 1 || tempoMax < 1 || tempoMax < tempoMin) return showError("Tempos inválidos.");

    setIsSending(true);
    await sendMessages({ contatos, instances: selectedInstances, tempoMin, tempoMax, usarIA, templates });
    setIsSending(false);
  };

  const summary = useMemo(() => ({
    contacts: contatos.length,
    instances: selectedInstances.length,
    messages: templates.length,
  }), [contatos.length, selectedInstances.length, templates.length]);

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader icon={Server} number={1} title="Selecione as Instâncias de Envio" subtitle="Escolha uma ou mais instâncias ativas que serão usadas para realizar os disparos." />
        <PremiumInstanceSelector instances={instances} selectedInstances={selectedInstances} onSelectionChange={setSelectedInstances} />
      </section>

      <section>
        <SectionHeader icon={Users} number={2} title="Defina o Público da Campanha" subtitle="Carregue um arquivo, ou digite os números manualmente." />
        <AudienceDefinition
          campaignName={campaignName} setCampaignName={setCampaignName}
          publicTarget={publicTarget} setPublicTarget={setPublicTarget}
          content={content} setContent={setContent}
          onUpload={setVariables}
        />
        {variables.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <Label>Variáveis Disponíveis:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {variables.map(v => <Badge key={v}>{`{${v}}`}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <SectionHeader icon={MessageSquare} number={3} title="Crie a Mensagem da Campanha" subtitle="Construa a sua mensagem e use as variáveis para máxima personalização." />
        <MessageCreator templates={templates} setTemplates={setTemplates} />
      </section>

      <section>
        <SectionHeader icon={Settings} number={4} title="Ajustes Finais e Envio" subtitle="Configure os últimos detalhes e revise sua campanha antes de disparar." />
        <FinalReview
          tempoMin={tempoMin} setTempoMin={setTempoMin}
          tempoMax={tempoMax} setTempoMax={setTempoMax}
          usarIA={usarIA} setUsarIA={setUsarIA}
          onSend={handleSend} isSending={isSending}
          summary={summary}
        />
      </section>

      <QrDialog />
      <ErrorDialog />
    </div>
  );
};