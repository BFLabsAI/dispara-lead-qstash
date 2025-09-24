"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart3, QrCode, Send } from "lucide-react";

interface KPIsProps {
  totalEnvios: number;
  totalIA: number;
  totalSemIA: number;
}

export const KPIs = ({ totalEnvios, totalIA, totalSemIA }: KPIsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-4"> {/* Added mb-8 and px-4 */}
      <Card className="glass-card rounded-2xl p-6 card-premium animate-slide-in-up">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-green-500/20 rounded-xl">
            <BarChart3 className="h-5 w-5 text-green-400" />
          </div>
          <TrendingUp className="h-4 w-4 text-green-500 animate-pulse-glow" />
        </div>
        <h3 className="font-medium text-gray-400 mb-1">Total de Envios</h3>
        <p className="text-3xl font-bold gradient-text">{totalEnvios}</p>
        <p className="text-sm text-green-400 mt-1">+12% este mês</p>
      </Card>
      
      <Card className="glass-card rounded-2xl p-6 card-premium animate-slide-in-up" style={{animationDelay: '0.1s'}}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <QrCode className="h-5 w-5 text-blue-400" />
          </div>
          <TrendingUp className="h-4 w-4 text-green-500 animate-pulse-glow" />
        </div>
        <h3 className="font-medium text-gray-400 mb-1">Com IA</h3>
        <p className="text-3xl font-bold gradient-text">{totalIA}</p>
        <p className="text-sm text-green-400 mt-1">Automação inteligente</p>
      </Card>
      
      <Card className="glass-card rounded-2xl p-6 card-premium animate-slide-in-up" style={{animationDelay: '0.2s'}}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-orange-500/20 rounded-xl">
            <Send className="h-5 w-5 text-orange-400" />
          </div>
          <TrendingUp className="h-4 w-4 text-green-500 animate-pulse-glow" />
        </div>
        <h3 className="font-medium text-gray-400 mb-1">Sem IA</h3>
        <p className="text-3xl font-bold gradient-text">{totalSemIA}</p>
        <p className="text-sm text-green-400 mt-1">Envios manuais</p>
      </Card>
    </div>
  );
};