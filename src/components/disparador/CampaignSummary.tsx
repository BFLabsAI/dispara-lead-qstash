"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Server, MessageSquare, Timer, Brain } from "lucide-react";

interface CampaignSummaryProps {
  contactCount: number;
  instanceCount: number;
  messageCount: number;
  delayMin: number;
  delayMax: number;
  useAI: boolean;
}

export const CampaignSummary = ({
  contactCount,
  instanceCount,
  messageCount,
  delayMin,
  delayMax,
  useAI,
}: CampaignSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo da Campanha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /> Público</span>
          <span className="font-semibold">{contactCount} contatos</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground"><Server className="h-4 w-4" /> Instâncias</span>
          <span className="font-semibold">{instanceCount} selecionadas</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="h-4 w-4" /> Mensagens</span>
          <span className="font-semibold">{messageCount} blocos</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground"><Timer className="h-4 w-4" /> Intervalo</span>
          <span className="font-semibold">{delayMin}s - {delayMax}s</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground"><Brain className="h-4 w-4" /> Inteligência Artificial</span>
          <span className="font-semibold">{useAI ? "Ativada" : "Desativada"}</span>
        </div>
      </CardContent>
    </Card>
  );
};