"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart3, QrCode, Send, Users, Brain, MessageCircle } from "lucide-react";

interface KPIsProps {
  totalEnvios: number;
  totalIA: number;
  totalSemIA: number;
}

export const KPIs = ({ totalEnvios, totalIA, totalSemIA }: KPIsProps) => {
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 section-mb">
      <Card className={`glass-card rounded-2xl card-premium animate-slide-in-up p-8 ${isDark ? '' : 'bg-green-50/50 border-green-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 bg-green-500/20 rounded-xl animate-pulse-glow kpi-icon ${isDark ? 'border border-green-500/30' : 'border border-green-500/30 bg-green-50'}`}>
            <BarChart3 className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <TrendingUp className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'} animate-pulse-glow`} />
        </div>
        <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Total de Envios</h3>
        <p className="text-4xl font-bold gradient-text mb-2">{totalEnvios.toLocaleString()}</p>
        <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>+12% este mês</p>
      </Card>
      
      <Card className={`glass-card rounded-2xl card-premium animate-slide-in-up p-8 ${isDark ? '' : 'bg-blue-50/50 border-blue-200'}`} style={{animationDelay: '0.1s'}}>
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 bg-blue-500/20 rounded-xl animate-pulse-glow kpi-icon ${isDark ? 'border border-blue-500/30' : 'border border-blue-500/30 bg-blue-50'}`}>
            <Brain className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <TrendingUp className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'} animate-pulse-glow`} />
        </div>
        <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Com IA</h3>
        <p className="text-4xl font-bold gradient-text mb-2">{totalIA.toLocaleString()}</p>
        <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>Automação inteligente</p>
      </Card>
      
      <Card className={`glass-card rounded-2xl card-premium animate-slide-in-up p-8 ${isDark ? '' : 'bg-orange-50/50 border-orange-200'}`} style={{animationDelay: '0.2s'}}>
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 bg-orange-500/20 rounded-xl animate-pulse-glow kpi-icon ${isDark ? 'border border-orange-500/30' : 'border border-orange-500/30 bg-orange-50'}`}>
            <MessageCircle className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <TrendingUp className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'} animate-pulse-glow`} />
        </div>
        <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Sem IA</h3>
        <p className="text-4xl font-bold gradient-text mb-2">{totalSemIA.toLocaleString()}</p>
        <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>Envios manuais</p>
      </Card>
    </div>
  );
};