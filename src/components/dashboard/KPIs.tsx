"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart3, Brain, MessageCircle } from "lucide-react"; // Removido TrendingUp das importações (não usado mais)

interface KPIsProps {
  totalEnvios: number;
  totalIA: number;
  totalSemIA: number;
}

export const KPIs = ({ totalEnvios, totalIA, totalSemIA }: KPIsProps) => {
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 section-mb">
      <Card className={`glass-card rounded-2xl card-premium animate-slide-in-up p-8 ${isDark ? '' : 'bg-green-50/70 border-green-200'}`}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6"> {/* Header: ícone + título lado a lado (sem seta direita) */}
            <div className={`p-3 bg-green-500/30 rounded-xl animate-pulse-glow kpi-icon border border-green-500/40`}>
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Total de Envios</h3> {/* Título ao lado do ícone */}
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{totalEnvios.toLocaleString()}</p> {/* Número em gradient-text */}
          <p className={`text-sm font-medium text-green-600`}>+12% este mês</p> {/* Subtexto verde */}
        </CardContent>
      </Card>
      
      <Card className={`glass-card rounded-2xl card-premium animate-slide-in-up p-8 ${isDark ? '' : 'bg-emerald-50/70 border-emerald-200'}`} style={{animationDelay: '0.1s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6"> {/* Header: ícone + título lado a lado */}
            <div className={`p-3 bg-emerald-500/30 rounded-xl animate-pulse-glow kpi-icon border border-emerald-500/40`}>
              <Brain className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Com IA</h3>
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{totalIA.toLocaleString()}</p>
          <p className={`text-sm font-medium text-emerald-600`}>Automação inteligente</p>
        </CardContent>
      </Card>
      
      <Card className={`glass-card rounded-2xl card-premium animate-slide-in-up p-8 ${isDark ? '' : 'bg-teal-50/70 border-teal-200'}`} style={{animationDelay: '0.2s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6"> {/* Header: ícone + título lado a lado */}
            <div className={`p-3 bg-teal-500/30 rounded-xl animate-pulse-glow kpi-icon border border-teal-500/40`}>
              <MessageCircle className="h-6 w-6 text-teal-600" />
            </div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Sem IA</h3>
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{totalSemIA.toLocaleString()}</p>
          <p className={`text-sm font-medium text-teal-600`}>Envios manuais</p>
        </CardContent>
      </Card>
    </div>
  );
};