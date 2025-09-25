"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Server, MessageSquare, ChevronsDown, ChevronsUp, Bot, Play, AlertTriangle, FileText, Clock } from "lucide-react";
import React from "react";

interface FinalReviewProps {
  tempoMin: number;
  setTempoMin: (t: number) => void;
  tempoMax: number;
  setTempoMax: (t: number) => void;
  usarIA: boolean;
  setUsarIA: (u: boolean) => void;
  onSend: () => void;
  isSending: boolean;
  summary: {
    contacts: number;
    instances: number;
    messages: number;
  };
  campaignName: string;
  publicTarget: string;
  content: string;
}

export const FinalReview = ({
  tempoMin, setTempoMin,
  tempoMax, setTempoMax,
  usarIA, setUsarIA,
  onSend, isSending,
  summary,
  campaignName,
  publicTarget,
  content
}: FinalReviewProps) => {
  return (
    <Card className="rounded-b-lg rounded-t-none glass-card">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna da Esquerda: Resumo */}
        <div className="space-y-6">
          <h4 className="text-lg font-bold">Resumo da Campanha</h4>
          
          {/* Big Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryMetric icon={Users} label="Contatos" value={summary.contacts} />
            <SummaryMetric icon={Server} label="Instâncias" value={summary.instances} />
            <SummaryMetric icon={MessageSquare} label="Mensagens" value={summary.messages} />
          </div>

          {/* Detailed List */}
          <div className="bg-card/80 p-4 rounded-lg">
            <ul className="space-y-2 text-sm">
              <DetailListItem icon={FileText} label="Campanha" value={campaignName || "Não definida"} />
              <DetailListItem icon={Users} label="Público" value={publicTarget || "Não definido"} />
              <DetailListItem icon={FileText} label="Conteúdo" value={content || "Não definido"} />
              <DetailListItem icon={Clock} label="Intervalo" value={`${tempoMin}s - ${tempoMax}s`} />
              <DetailListItem icon={Bot} label="Inteligência Artificial" value={usarIA ? "Ativada" : "Desativada"} />
            </ul>
          </div>
        </div>
        
        {/* Coluna da Direita: Ajustes e Disparo */}
        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-bold mb-4">Ajustes de Envio</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ChevronsDown className="h-4 w-4" /> Tempo mínimo (s)</Label>
                <Input type="number" value={tempoMin} onChange={e => setTempoMin(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ChevronsUp className="h-4 w-4" /> Tempo máximo (s)</Label>
                <Input type="number" value={tempoMax} onChange={e => setTempoMax(Number(e.target.value))} />
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                  <Switch id="ai-switch" checked={usarIA} onCheckedChange={setUsarIA} />
                  <Label htmlFor="ai-switch" className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5" /> Usar IA</Label>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md border border-blue-200 dark:border-blue-800 text-sm">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                  Cria leves variações da sua mensagem para melhorar a entrega.
                </div>
              </div>
            </div>
          </div>
          <Button size="lg" onClick={onSend} disabled={isSending} className="w-full btn-premium">
            <Play className="mr-2 h-5 w-5" />
            {isSending ? 'Disparando...' : 'Disparar Campanha'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

const SummaryMetric = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="bg-card/80 p-3 rounded-lg text-center animate-scale-in shadow-sm">
    <Icon className="h-6 w-6 mx-auto mb-1 text-primary" />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const DetailListItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <li className="flex justify-between items-center">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <span className="font-semibold text-right">{value}</span>
  </li>
);