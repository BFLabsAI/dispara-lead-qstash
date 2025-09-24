"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { showError } from "@/utils/toast";
import { useDisparadorStore } from "../../store/disparadorStore";
import { MessageBlock } from "./MessageBlock";
import { InstanceSelector } from "./InstanceSelector";
import { QrDialog } from "./QrDialog";
import { ErrorDialog } from "./ErrorDialog";
import { ContactUploader } from "./ContactUploader";

export const ShooterConfig = () => {
  const [qtdMensagens, setQtdMensagens] = useState(1);
  const [tempoMin, setTempoMin] = useState(2);
  const [tempoMax, setTempoMax] = useState(5);
  const [usarIA, setUsarIA] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);

  const { instances, contatos, templates, setTemplates, sendMessages, stopSending, loadInstances } = useDisparadorStore();

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleSend = async () => {
    if (selectedInstances.length === 0) return showError("Nenhuma instância selecionada.");
    if (contatos.length === 0) return showError("Nenhum contato fornecido.");
    if (tempoMin < 1 || tempoMax < 1 || tempoMax < tempoMin) return showError("Tempos inválidos.");

    setIsSending(true);
    setProgress(0);
    const result = await sendMessages({
      contatos,
      instances: selectedInstances,
      tempoMin,
      tempoMax,
      usarIA,
      templates,
    });
    setIsSending(false);
    setStatus(result.sucessos + " sucessos, " + result.erros + " erros.");
  };

  const connectedInstances = instances.filter((i) => i.connectionStatus === "open" || i.connectionStatus === "connected");

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="bi bi-rocket-takeoff"></i>Configuração de Disparo
        </h4>
        <InstanceSelector 
          instances={connectedInstances} 
          selectedInstances={selectedInstances}
          onSelectionChange={setSelectedInstances} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ContactUploader onUpload={setVariables} />
          <div>
            <Label className="flex items-center gap-1 mb-2">
              <i className="bi bi-tags"></i>Variáveis disponíveis
            </Label>
            <div className="border p-2 rounded-md bg-muted h-full min-h-[100px] overflow-y-auto flex flex-wrap gap-1 content-start">
              {variables.length > 0 ? (
                variables.map((key) => (
                  <Badge key={key} variant="secondary" className="cursor-pointer">
                    {`{${key}}`}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-2">Carregue um arquivo para ver as variáveis.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <Label>Tempo min (s)</Label>
            <Input type="number" value={tempoMin} onChange={(e) => setTempoMin(+e.target.value)} min={1} />
          </div>
          <div>
            <Label>Tempo max (s)</Label>
            <Input type="number" value={tempoMax} onChange={(e) => setTempoMax(+e.target.value)} min={1} />
          </div>
          <div>
            <Label>Qtd. Mensagens</Label>
            <Input type="number" value={qtdMensagens} onChange={(e) => { setQtdMensagens(+e.target.value); setTemplates([]); }} min={1} />
          </div>
        </div>
        <div className="space-y-4 mb-4">
          {Array.from({ length: qtdMensagens }).map((_, i) => (
            <MessageBlock key={i} index={i} onUpdate={(tpl) => {
              const newTemplates = [...templates];
              newTemplates[i] = tpl;
              setTemplates(newTemplates);
            }} />
          ))}
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Switch id="usarIA" checked={usarIA} onCheckedChange={setUsarIA} />
          <Label htmlFor="usarIA" className="flex items-center gap-1">
            <i className="bi bi-robot"></i>Usar IA
          </Label>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSend} disabled={isSending}>
            <i className="bi bi-send-fill mr-2"></i>Disparar Mensagens
          </Button>
          {isSending && (
            <Button variant="destructive" className="flex-1" onClick={stopSending}>
              ⏹️ Parar
            </Button>
          )}
        </div>
        {progress > 0 && (
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground mt-1">{status}</p>
          </div>
        )}
      </CardContent>
      <QrDialog />
      <ErrorDialog />
    </Card>
  );
};