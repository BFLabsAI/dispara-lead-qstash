"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart3, QrCode, Send, Users, Brain, MessageCircle } from "lucide-react";

interface KPIsProps {
  totalEnvios: number;
  totalIA: number;
  totalSemIA: number;
}

export const KPIs = ({ totalEnvios, totalIA, totalSemIA }: KPIsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 section-mb"> {/* Increased gap/mb */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8"> {/* Increased padding */}
        <div className="flex items-center justify-between mb-6">
          <div className="p-3 bg-green-500/20 rounded-xl animate-pulse-glow">
            <BarChart3 className="h-6 w-6 text-green-400" />
          </div>
          <TrendingUp className="h-5 w-5 text-green-400 animate-pulse-glow" />
        </div>
        <h3 className="font-semibold text-lg text-gray-300 mb-2">Total de Envios</h3>
        <p className="text-4xl font-bold gradient-text mb-2">{totalEnvios.toLocaleString()}</p>
        <p className="text-sm text-green-400 font-medium">+12% este mês</p>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.1s'}}>
        <div className="flex items-center justify-between mb-6">
          <div className="p-3 bg-blue-500/20 rounded-xl animate-pulse-glow">
            <Brain className="h-6 w-6 text-blue-400" />
          </div>
          <TrendingUp className="h-5 w-5 text-green-400 animate-pulse-glow" />
        </div>
        <h3 className="font-semibold text-lg text-gray-300 mb-2">Com IA</h3>
        <p className="text-4xl font-bold gradient-text mb-2">{totalIA.toLocaleString()}</p>
        <p className="text-sm text-green-400 font-medium">Automação inteligente</p>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.2s'}}>
        <div className="flex items-center justify-between mb-6">
          <div className="p-3 bg-orange-500/20 rounded-xl animate-pulse-glow">
            <MessageCircle className="h-6 w-6 text-orange-400" />
          </div>
          <TrendingUp className="h-5 w-5 text-green-400 animate-pulse-glow" />
        </div>
        <h3 className="font-semibold text-lg text-gray-300 mb-2">Sem IA</h3>
        <p className="text-4xl font-bold gradient-text mb-2">{totalSemIA.toLocaleString()}</p>
        <p className="text-sm text-green-400 font-medium">Envios manuais</p>
      </Card>
    </div>
  );
};