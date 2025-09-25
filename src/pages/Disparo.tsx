"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { showError } from "@/utils/toast";
import { useDisparadorStore } from "@/store/disparadorStore";
import { MessageBlock } from "@/components/disparador/MessageBlock";
import { InstanceSelector } from "@/components/disparador/InstanceSelector";
import { ContactUploader } from "@/components/disparador/ContactUploader";
import { StepBanner } from "@/components/disparador/StepBanner";
import { CampaignPreview } from "@/components/disparador/CampaignPreview";
import { CampaignSummary } from "@/components/disparador/CampaignSummary";
import { Server, Users, MessageSquare, Settings, Rocket } from "lucide-react";

const Disparo = () => {
  const [tempoMin, setTempoMin] = useState(2);
  const [tempoMax, setTempoMax] = useState(5);
  const [usarIA, setUsarIA] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([{ type: 'texto', text: '', mediaUrl: '' }]);

  const { instances, contatos, sendMessages, stopSending, loadInstances } = useDisparadorStore();

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

  const connectedInstances = useMemo(() =>
    instances.filter((i) => i.connectionStatus === "open" || i.connectionStatus === "connected"),
    [instances]
  );

  const handleTemplateUpdate = useCallback((index: number, tpl: any) => {
    const newTemplates = [...templates];
    newTemplates[index] = tpl;
    setTemplates(newTemplates);
  }, [templates]);

  const addMessageBlock = () => {
    setTemplates([...templates, { type: 'texto', text: '', mediaUrl: '' }]);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Criar Nova Campanha de Disparo</h1>

      <Card>
        <StepBanner step={1} icon={<Server />} title="Selecione as Instâncias de Envio" description="Escolha uma ou mais instâncias ativas que serão usadas para realizar os disparos." />
        <CardContent className="p-6">
          <InstanceSelector instances={connectedInstances} selectedInstances={selectedInstances} onSelectionChange={setSelectedInstances} />
        </CardContent>
      </Card>

      <Card>
        <StepBanner step={2} icon={<Users />} title="Defina o Público da Campanha" description="Arraste ou selecione seu arquivo de contatos em formato XLSX." />
        <CardContent className="p-6">
          <ContactUploader onUpload={setVariables} />
          {variables.length > 0 && (
            <div className="mt-4">
              <Label className="mb-2 block">Variáveis Encontradas:</Label>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => <Badge key={v} variant="secondary">{`{${v}}`}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <StepBanner step={3} icon={<MessageSquare />} title="Crie a Mensagem da Campanha" description="Construa a mensagem que seus contatos receberão. Use as variáveis para máxima personalização." />
        <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {templates.map((_, i) => <MessageBlock key={i} index={i} onUpdate={handleTemplateUpdate} />)}
            <Button variant="outline" onClick={addMessageBlock}>+ Adicionar Bloco de Mensagem</Button>
          </div>
          <div>
            <CampaignPreview templates={templates} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Settings /> Ajustes Finais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tempo min (s)</Label>
              <Input type="number" value={tempoMin} onChange={(e) => setTempoMin(+e.target.value)} min={1} />
            </div>
            <div>
              <Label>Tempo max (s)</Label>
              <Input type="number" value={tempoMax} onChange={(e) => setTempoMax(+e.target.value)} min={1} />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch id="usarIA" checked={usarIA} onCheckedChange={setUsarIA} />
              <Label htmlFor="usarIA">Usar IA</Label>
            </div>
          </div>
          <CampaignSummary
            contactCount={contatos.length}
            instanceCount={selectedInstances.length}
            messageCount={templates.length}
            delayMin={tempoMin}
            delayMax={tempoMax}
            useAI={usarIA}
          />
          <div className="flex justify-end gap-2">
            {isSending && <Button variant="destructive" onClick={stopSending}>⏹️ Parar Envio</Button>}
            <Button size="lg" onClick={handleSend} disabled={isSending}>
              <Rocket className="mr-2 h-5 w-5" />
              {isSending ? "Enviando..." : "Disparar Campanha"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Disparo;