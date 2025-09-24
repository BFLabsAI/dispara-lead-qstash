"use client";

import { Card } from "@/components/ui/card";

interface KPIsProps {
  totalEnvios: number;
  totalIA: number;
  totalSemIA: number;
}

export const KPIs = ({ totalEnvios, totalIA, totalSemIA }: KPIsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="text-center p-6">
        <div className="text-3xl font-bold text-foreground mb-1">{totalEnvios}</div>
        <div className="text-sm text-muted-foreground">Total de Envios</div>
      </Card>
      <Card className="text-center p-6">
        <div className="text-3xl font-bold text-foreground mb-1">{totalIA}</div>
        <div className="text-sm text-muted-foreground">Envios com IA</div>
      </Card>
      <Card className="text-center p-6">
        <div className="text-3xl font-bold text-foreground mb-1">{totalSemIA}</div>
        <div className="text-sm text-muted-foreground">Envios sem IA</div>
      </Card>
    </div>
  );
};