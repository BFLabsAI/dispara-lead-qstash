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
  const [tempoMin, setTempoMin] = useState(15);
  const [tempoMax, setTempoMax] = useState(25);
  const [usarIA, setUsarIA] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Store
  const { instances, contatos, sendMessages, loadInstances } = useDisparadorStore();

  const handleTempoMin = (val: number) => {
    const minLimit = contatos.length > 150 ? 25 : 15;
    const newMin = Math.max(minLimit, val);
    setTempoMin(newMin);
    if (tempoMax < newMin + 10) {
      setTempoMax(newMin + 10);
    }
  };

  const handleTempoMax = (val: number) => {
    const newMax = Math.max(0, val);
    setTempoMax(newMax);
    if (tempoMin > newMax - 10) {
      setTempoMin(Math.max(0, newMax - 10)); // Logic in handleTempoMin will re-enforce limit if needed? No, separate state.
      // If we lower Max, Min is lowered. Check limit?
      // If Max=30, Min becomes 20. But if Limit=25?
      // Then Max cannot be 30. Max must be >= 35.
      // So verify Max lower bound?
      // Logic: Max >= Min + 10 >= Limit + 10.
      const minLimit = contatos.length > 150 ? 25 : 15;
      if (newMax < minLimit + 10) {
        // Revert or clamp?
        // Clamp Max to minLimit + 10
        setTempoMax(minLimit + 10);
        setTempoMin(minLimit);
      } else {
        // Normal gap enforcement
        if (tempoMin > newMax - 10) {
          setTempoMin(newMax - 10);
        }
      }
    }
  };

  // Auto-adjust when contacts change
  useEffect(() => {
    const minLimit = contatos.length > 150 ? 25 : 15;
    if (tempoMin < minLimit) {
      handleTempoMin(minLimit);
    }
  }, [contatos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleSend = async () => {
    if (selectedInstances.length === 0) return showError("Nenhuma instância selecionada.");
    if (contatos.length === 0) return showError("Nenhum contato fornecido.");
    if (tempoMin < 1 || tempoMax < 1 || tempoMax < tempoMin) return showError("Tempos inválidos.");

    setIsSending(true);
    await sendMessages({
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
        <MessageCreator templates={templates} setTemplates={setTemplates} variables={variables} />
      </section>

      <section>
        <SectionHeader icon={Settings} number={4} title="Ajustes Finais e Envio" subtitle="Configure os últimos detalhes e revise sua campanha antes de disparar." />
        <FinalReview
          tempoMin={tempoMin} setTempoMin={handleTempoMin}
          tempoMax={tempoMax} setTempoMax={handleTempoMax}
          usarIA={usarIA} setUsarIA={setUsarIA}
          onSend={handleSend} isSending={isSending}

          summary={summary}
          campaignName={campaignName}
          publicTarget={publicTarget}
          content={content}
        />
      </section>

      <QrDialog />
      <ErrorDialog />
    </div>
  );
};