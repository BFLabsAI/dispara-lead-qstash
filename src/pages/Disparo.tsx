"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Server, Users, MessageSquare, Settings, Rocket, Info } from "lucide-react";

const Disparo = () => {
  const [tempoMin, setTempoMin] = useState(2);
  const [tempoMax, setTempoMax] = useState(5);
  const [usarIA, setUsarIA] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([{ type: 'texto', text: '', mediaUrl: '' }]);
  const [manualContacts, setManualContacts] = useState("");

  const { instances, contatos, setContatos, sendMessages, stopSending, loadInstances } = useDisparadorStore();

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    if (manualContacts) {
      const numbers = manualContacts.split(/[\n,]/).map(n => n.trim()).filter(Boolean);
      const contactObjects = numbers.map(n => ({ "telefone": n }));
      setContatos(contactObjects);
    }
  }, [manualContacts, setContatos]);

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

  const deleteMessageBlock = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
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
        <StepBanner step={2} icon={<Users />} title="Defina o Público da Campanha" description="Carregue um arquivo, ou digite os números manualmente." />
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input placeholder="Nome da Campanha (Ex: Promoção de Natal)" />
            <Input placeholder="Público (Ex: Clientes VIP)" />
          </div>
          <Textarea placeholder="Conteúdo (Ex: Envio de cupom de desconto para clientes que compraram nos últimos 30 dias)" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ContactUploader onUpload={setVariables} />
            <div className="space-y-2">
              <Label>Ou digite os números (um por linha ou separados por vírgula)</Label>
              <Textarea 
                placeholder="5511999998888, 5521988887777" 
                rows={6}
                value={manualContacts}
                onChange={(e) => setManualContacts(e.target.value)}
              />
            </div>
          </div>

          {variables.length > 0 && (
            <div>
              <Label className="mb-2 block">Variáveis Encontradas no Arquivo:</Label>
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
            {templates.map((_, i) => <MessageBlock key={i} index={i} onUpdate={handleTemplateUpdate} onDelete={deleteMessageBlock} />)}
            <Button variant="outline" onClick={addMessageBlock}>+ Adicionar Bloco de Mensagem</Button>
          </div>
          <div>
            <CampaignPreview templates={templates} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <StepBanner step={4} icon={<Settings />} title="Ajustes Finais e Envio" description="Configure os últimos detalhes e revise sua campanha antes de disparar." />
        <CardContent className="p-6 space-y-6">
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
              <Label htmlFor="usarIA" className="flex items-center gap-1">Usar IA <Info className="h-4 w-4 text-muted-foreground" /></Label>
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