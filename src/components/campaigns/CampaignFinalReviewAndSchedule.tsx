"use client";

import { Card } from "@/components/ui/card"; // Importar Card
import { Button } from "@/components/ui/button"; // Importar Button
import { Input } from "@/components/ui/input"; // Importar Input
import { Label } from "@/components/ui/label"; // Importar Label
import { Switch } from "@/components/ui/switch"; // Importar Switch
import { Users, Server, MessageSquare, ChevronsDown, ChevronsUp, Bot, Play, AlertTriangle, FileText, Clock, Calendar as CalendarIcon } from "lucide-react";
import React from "react";

interface CampaignFinalReviewAndScheduleProps {
  tempoMin: number;
  setTempoMin: (t: number) => void;
  tempoMax: number;
  setTempoMax: (t: number) => void;
  usarIA: boolean;
  setUsarIA: (u: boolean) => void;
  onSchedule: () => void;
  onAdvancedSchedule: () => void;
  isScheduling: boolean;
  summary: {
    contacts: number;
    instances: number;
    totalDispatches: number; // Novo: total de disparos configurados
  };
  campaignName: string;
  publicTarget: string;
  content: string;
}

export const CampaignFinalReviewAndSchedule = ({
  tempoMin, setTempoMin,
  tempoMax, setTempoMax,
  usarIA, setUsarIA,
  onSchedule, isScheduling,
  onAdvancedSchedule,
  summary,
  campaignName,
  publicTarget,
  content
}: CampaignFinalReviewAndScheduleProps) => {

  const SummaryCircle = ({ icon: Icon, label, value, color, ringColor }: { icon: React.ElementType, label: string, value: string | number, color: string, ringColor: string }) => (
    <div className="flex flex-col items-center gap-2 animate-scale-in">
      <div className={`relative flex items-center justify-center w-28 h-28 rounded-full border-8 bg-card/50 ${ringColor}`}>
        <div className="absolute -top-4 p-2 bg-card rounded-full shadow-md border">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="text-center">
          <p className={`text-4xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
      <p className="font-semibold text-muted-foreground mt-2">{label}</p>
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

  // Validação básica para habilitar o botão de agendamento
  const isFormValid = summary.contacts > 0 && summary.instances > 0 && summary.totalDispatches > 0 && campaignName.trim() !== "" && publicTarget.trim() !== "" && content.trim() !== "";

  // Helper to determine minimum safe delay based on contact count
  const getMinSafeDelay = (count: number) => {
    if (count > 250) return { min: 30, max: 50 };
    if (count > 100) return { min: 25, max: 40 };
    return { min: 15, max: 30 };
  };

  const safeLimits = getMinSafeDelay(summary.contacts);

  // Auto-adjust delays when contact count changes
  React.useEffect(() => {
    if (tempoMin < safeLimits.min) setTempoMin(safeLimits.min);
    if (tempoMax < safeLimits.max) setTempoMax(safeLimits.max);
  }, [summary.contacts, safeLimits.min, safeLimits.max, setTempoMin, setTempoMax]);

  // Handler to enforce min limit on change
  const handleMinChange = (val: number) => {
    if (val < safeLimits.min) return; // Prevent going below limit
    setTempoMin(val);
  };

  const handleMaxChange = (val: number) => {
    if (val < safeLimits.max) return; // Prevent going below limit
    setTempoMax(val);
  };

  return (
    <Card className="rounded-b-lg rounded-t-none glass-card">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna da Esquerda: Resumo */}
        <div className="space-y-6">
          <h4 className="text-lg font-bold">Resumo da Campanha</h4>

          {/* Big Numbers - Estilo Progress Circle */}
          <div className="flex justify-around items-center pt-4">
            <SummaryCircle icon={Users} label="Contatos" value={summary.contacts} color="text-green-500" ringColor="border-green-500/30" />
            <SummaryCircle icon={Server} label="Instâncias" value={summary.instances} color="text-emerald-500" ringColor="border-emerald-500/30" />
            <SummaryCircle icon={CalendarIcon} label="Disparos" value={summary.totalDispatches} color="text-teal-500" ringColor="border-teal-500/30" />
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

        {/* Coluna da Direita: Ajustes e Agendamento */}
        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-bold mb-4">Ajustes de Envio</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ChevronsDown className="h-4 w-4" /> Tempo mínimo (s)</Label>
                <Input type="number" min={safeLimits.min} value={tempoMin} onChange={e => handleMinChange(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Mínimo seguro: {safeLimits.min}s</p>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ChevronsUp className="h-4 w-4" /> Tempo máximo (s)</Label>
                <Input type="number" min={safeLimits.max} value={tempoMax} onChange={e => handleMaxChange(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Mínimo seguro: {safeLimits.max}s</p>
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
          <Button size="lg" onClick={onSchedule} disabled={isScheduling || !isFormValid} className="w-full btn-premium">
            <Play className="mr-2 h-5 w-5" />
            {isScheduling ? 'Agendando Campanha...' : 'Agendar Campanha'}
          </Button>

          <Button size="lg" variant="outline" onClick={onAdvancedSchedule} disabled={isScheduling || !isFormValid} className="w-full border-primary text-primary hover:bg-primary/10">
            <Server className="mr-2 h-5 w-5" />
            {isScheduling ? 'Enfileirando...' : 'Agendar Campanha Avançada (Fila)'}
          </Button>
        </div>
      </div>
    </Card>
  );
};