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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Total de Envios</h3>
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{totalEnvios.toLocaleString()}</p>
          <p className="text-sm font-medium text-green-600">+12% este mês</p>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <Brain className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Com IA</h3>
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{totalIA.toLocaleString()}</p>
          <p className="text-sm font-medium text-green-600">Automação inteligente</p>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.2s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Sem IA</h3>
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{totalSemIA.toLocaleString()}</p>
          <p className="text-sm font-medium text-green-600">Envios manuais</p>
        </CardContent>
      </Card>
    </div>
  );
};