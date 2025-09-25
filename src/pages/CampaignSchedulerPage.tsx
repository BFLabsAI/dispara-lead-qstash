"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/disparador/SectionHeader";
import { PremiumInstanceSelector } from "@/components/disparador/PremiumInstanceSelector";
import { AudienceDefinition } from "@/components/disparador/AudienceDefinition";
import { MultiDispatchCreator } from "@/components/campaigns/MultiDispatchCreator"; // Novo componente
import { CampaignFinalReviewAndSchedule } from "@/components/campaigns/CampaignFinalReviewAndSchedule"; // Novo componente
import { useDisparadorStore } from "@/store/disparadorStore";
import { showError, showSuccess } from "@/utils/toast";
import { Server, Users, Settings, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from 'uuid'; // Para gerar o campaign_group_id
import { Card, CardContent, Badge, Label } from "@/components/ui/index"; // Importar Card, CardContent, Badge, Label

interface DispatchConfig {
  id: string;
  datetime: Date | undefined;
  templates: any[];
}

const CampaignSchedulerPage = () => {
  // Estado da campanha (global para o grupo de disparos)
  const [campaignName, setCampaignName] = useState("");
  const [publicTarget, setPublicTarget] = useState("");
  const [content, setContent] = useState("");
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [tempoMin, setTempoMin] = useState(2);
  const [tempoMax, setTempoMax] = useState(5);
  const [usarIA, setUsarIA] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Estado para os múltiplos blocos de disparo
  const [dispatchBlocks, setDispatchBlocks] = useState<DispatchConfig[]>([
    { id: uuidv4(), datetime: undefined, templates: [{ type: 'texto', text: '', mediaUrl: '' }] }
  ]);

  // Store
  const { instances, contatos, loadInstances, scheduleCampaign } = useDisparadorStore();

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleScheduleCampaign = async () => {
    // Validações globais
    if (selectedInstances.length === 0) return showError("Nenhuma instância selecionada.");
    if (contatos.length === 0) return showError("Nenhum contato fornecido.");
    if (tempoMin < 1 || tempoMax < 1 || tempoMax < tempoMin) return showError("Tempos de intervalo inválidos.");
    if (!campaignName.trim()) return showError("O nome da campanha é obrigatório.");
    if (!publicTarget.trim()) return showError("O público-alvo é obrigatório.");
    if (!content.trim()) return showError("O conteúdo da campanha é obrigatório.");

    // Validações por bloco de disparo
    if (dispatchBlocks.length === 0) return showError("Configure pelo menos um disparo.");
    for (const block of dispatchBlocks) {
      if (!block.datetime) return showError("Todos os disparos devem ter uma data e hora definidas.");
      if (block.templates.some(t => !t.text && !t.mediaUrl)) return showError("Mensagens não podem estar vazias em nenhum disparo.");
    }

    setIsScheduling(true);
    try {
      const campaignGroupId = uuidv4(); // Gerar um ID de grupo para esta campanha

      // Enviar um request para cada bloco de disparo
      for (let i = 0; i < dispatchBlocks.length; i++) {
        const block = dispatchBlocks[i];
        await scheduleCampaign({
          campaignGroupId: campaignGroupId, // Passar o ID do grupo
          dispatchOrder: i + 1, // Ordem do disparo
          campaignName,
          publicTarget,
          content,
          contatos,
          instances: selectedInstances,
          templates: block.templates, // Templates específicos deste disparo
          tempoMin,
          tempoMax,
          usarIA,
          horaAgendamento: block.datetime!.toISOString(), // Hora específica deste disparo
        });
      }
      showSuccess("Campanha agendada com sucesso!");
      // Resetar formulário após agendamento
      setCampaignName("");
      setPublicTarget("");
      setContent("");
      setSelectedInstances([]);
      setVariables([]);
      setTempoMin(2);
      setTempoMax(5);
      setUsarIA(false);
      setDispatchBlocks([{ id: uuidv4(), datetime: undefined, templates: [{ type: 'texto', text: '', mediaUrl: '' }] }]);
    } catch (error) {
      showError("Erro ao agendar campanha: " + (error as Error).message);
    } finally {
      setIsScheduling(false);
    }
  };

  const summary = useMemo(() => ({
    contacts: contatos.length,
    instances: selectedInstances.length,
    totalDispatches: dispatchBlocks.length,
  }), [contatos.length, selectedInstances.length, dispatchBlocks.length]);

  return (
    <div className="space-y-8">
      <PageHeader title="Agendar Campanha Múltipla" subtitle="Configure e agende até 5 disparos com mensagens e horários distintos." />

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
          <Card className="mt-4 glass-card">
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
        <SectionHeader icon={MessageSquare} number={3} title="Configure os Disparos (Mensagens e Horários)" subtitle="Crie as mensagens e defina a data e hora para cada disparo da sua campanha." />
        <MultiDispatchCreator
          dispatchBlocks={dispatchBlocks}
          setDispatchBlocks={setDispatchBlocks}
          variables={variables}
        />
      </section>

      <section>
        <SectionHeader icon={Settings} number={4} title="Ajustes Finais e Agendamento" subtitle="Configure os últimos detalhes e agende sua campanha." />
        <CampaignFinalReviewAndSchedule
          tempoMin={tempoMin} setTempoMin={setTempoMin}
          tempoMax={tempoMax} setTempoMax={setTempoMax}
          usarIA={usarIA} setUsarIA={setUsarIA}
          onSchedule={handleScheduleCampaign} isScheduling={isScheduling}
          summary={summary}
          campaignName={campaignName}
          publicTarget={publicTarget}
          content={content}
        />
      </section>
    </div>
  );
};

export default CampaignSchedulerPage;