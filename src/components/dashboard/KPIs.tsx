"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Brain, MessageCircle } from "lucide-react";

interface KPIsProps {
  totalEnvios: number;
  totalIA: number;
  totalSemIA: number;
}

export const KPIs = ({ totalEnvios, totalIA, totalSemIA }: KPIsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card className="glass-card animate-slide-in-up">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-lg border border-primary/30">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Total de Envios</h3>
          </div>
          <p className="text-4xl font-bold gradient-text">{totalEnvios.toLocaleString()}</p>
          <p className="text-sm font-medium text-primary/80">+12% este mês</p>
        </CardContent>
      </Card>
      
      <Card className="glass-card animate-slide-in-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-lg border border-primary/30">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Com IA</h3>
          </div>
          <p className="text-4xl font-bold gradient-text">{totalIA.toLocaleString()}</p>
          <p className="text-sm font-medium text-primary/80">Automação inteligente</p>
        </CardContent>
      </Card>
      
      <Card className="glass-card animate-slide-in-up" style={{animationDelay: '0.2s'}}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-lg border border-primary/30">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Sem IA</h3>
          </div>
          <p className="text-4xl font-bold gradient-text">{totalSemIA.toLocaleString()}</p>
          <p className="text-sm font-medium text-primary/80">Envios manuais</p>
        </CardContent>
      </Card>
    </div>
  );
};