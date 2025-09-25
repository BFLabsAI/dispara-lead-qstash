"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Users, Server, MessageSquare, Timer, BrainCircuit, Play } from "lucide-react";

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
}

export const FinalReview = ({
  tempoMin, setTempoMin,
  tempoMax, setTempoMax,
  usarIA, setUsarIA,
  onSend, isSending,
  summary
}: FinalReviewProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <Label>Tempo min (s)</Label>
                <Input type="number" value={tempoMin} onChange={e => setTempoMin(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Tempo max (s)</Label>
                <Input type="number" value={tempoMax} onChange={e => setTempoMax(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="ai-switch" checked={usarIA} onCheckedChange={setUsarIA} />
              <Label htmlFor="ai-switch">Usar IA</Label>
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-4">Resumo da Campanha</h4>
            <div className="space-y-3">
              <SummaryItem icon={Users} label="Público" value={`${summary.contacts} contatos`} />
              <SummaryItem icon={Server} label="Instâncias" value={`${summary.instances} selecionadas`} />
              <SummaryItem icon={MessageSquare} label="Mensagens" value={`${summary.messages} blocos`} />
              <SummaryItem icon={Timer} label="Intervalo" value={`${tempoMin}s - ${tempoMax}s`} />
              <SummaryItem icon={BrainCircuit} label="Inteligência Artificial" value={usarIA ? 'Ativada' : 'Desativada'} />
            </div>
          </div>
        </div>
        <Separator className="my-6" />
        <div className="flex justify-end">
          <Button size="lg" onClick={onSend} disabled={isSending}>
            <Play className="mr-2 h-5 w-5" />
            {isSending ? 'Disparando...' : 'Disparar Campanha'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const SummaryItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <span className="font-medium">{value}</span>
  </div>
);