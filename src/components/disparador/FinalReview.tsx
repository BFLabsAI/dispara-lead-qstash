"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Server, MessageSquare, ChevronsDown, ChevronsUp, Bot, Play, AlertTriangle } from "lucide-react";

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
    <Card className="rounded-b-xl border-t-0 glass-card">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><ChevronsDown className="h-4 w-4" /> Tempo mínimo (s)</Label>
              <Input type="number" value={tempoMin} onChange={e => setTempoMin(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><ChevronsUp className="h-4 w-4" /> Tempo máximo (s)</Label>
              <Input type="number" value={tempoMax} onChange={e => setTempoMax(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Switch id="ai-switch" checked={usarIA} onCheckedChange={setUsarIA} />
              <Label htmlFor="ai-switch" className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5" /> Usar IA</Label>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md border border-blue-200 dark:border-blue-800 text-sm">
              <AlertTriangle className="h-4 w-4 inline-block mr-1" />
              Ao ativar, nosso sistema criará leves variações da sua mensagem para melhorar a entrega.
            </div>
          </div>
        </div>
        
        <div className="bg-muted/50 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-4">Resumo da Campanha</h4>
          <div className="grid grid-cols-2 gap-4">
            <SummaryItem icon={Users} label="Contatos" value={summary.contacts} color="text-blue-500" />
            <SummaryItem icon={Server} label="Instâncias" value={summary.instances} color="text-purple-500" />
            <SummaryItem icon={MessageSquare} label="Mensagens" value={summary.messages} color="text-green-500" />
            <SummaryItem icon={ChevronsUp} label="Intervalo" value={`${tempoMin}s - ${tempoMax}s`} color="text-orange-500" />
          </div>
          <div className="mt-6">
            <Button size="lg" onClick={onSend} disabled={isSending} className="w-full btn-premium">
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
  <div className="bg-card p-3 rounded-md flex items-center gap-3 animate-scale-in">
    <div className={`p-2 rounded bg-primary/10 ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);