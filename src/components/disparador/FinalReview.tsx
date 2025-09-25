"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Server, MessageSquare, Timer, BrainCircuit, Play, AlertTriangle } from "lucide-react";

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
    <Card className="rounded-b-xl border-t-0">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> Tempo mínimo (s)</Label>
              <Input type="number" value={tempoMin} onChange={e => setTempoMin(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> Tempo máximo (s)</Label>
              <Input type="number" value={tempoMax} onChange={e => setTempoMax(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Switch id="ai-switch" checked={usarIA} onCheckedChange={setUsarIA} className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="ai-switch" className="flex items-center gap-1.5 font-semibold"><BrainCircuit className="h-4 w-4" /> Usar IA</Label>
              <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200 text-sm">
                <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                Ao ativar, nosso sistema criará leves variações da sua mensagem para melhorar a entrega.
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-muted/50 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-4">Resumo da Campanha</h4>
          <div className="grid grid-cols-2 gap-4">
            <SummaryItem icon={Users} label="Contatos" value={summary.contacts} color="text-blue-500" />
            <SummaryItem icon={Server} label="Instâncias" value={summary.instances} color="text-purple-500" />
            <SummaryItem icon={MessageSquare} label="Mensagens" value={summary.messages} color="text-green-500" />
            <SummaryItem icon={Timer} label="Intervalo" value={`${tempoMin}s - ${tempoMax}s`} color="text-orange-500" />
          </div>
          <div className="mt-6">
            <Button size="lg" onClick={onSend} disabled={isSending} className="w-full">
              <Play className="mr-2 h-5 w-5" />
              {isSending ? 'Disparando...' : 'Disparar Campanha'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const SummaryItem = ({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: string }) => (
  <div className="bg-card p-3 rounded-md flex items-center gap-3">
    <div className={`p-2 rounded bg-primary/10 ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);