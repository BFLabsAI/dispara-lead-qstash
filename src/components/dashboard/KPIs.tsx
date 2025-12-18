import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Brain, MessageCircle, Calendar, Clock, MessageSquare } from "lucide-react";

interface KPIsProps {
  totalEnvios: number;
  totalIA: number;
  totalSemIA: number;
  agendadasCount: number;
  filaCount: number;
  totalResponded: number;
  responseRate: number;
}

export const KPIs = ({
  totalEnvios,
  totalIA,
  totalSemIA,
  agendadasCount,
  filaCount,
  totalResponded = 0,
  responseRate = 0
}: KPIsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
      <Card className="glass-card animate-slide-in-up">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-lg border border-primary/30">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Total de Envios</h3>
          </div>
          <p className="text-4xl font-bold gradient-text">{totalEnvios.toLocaleString()}</p>
          <p className="text-sm font-medium text-primary/80">Histórico completo</p>
        </CardContent>
      </Card>

      <Card className="glass-card animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <Brain className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-semibold text-lg">Com IA</h3>
          </div>
          <p className="text-4xl font-bold text-purple-500">{totalIA.toLocaleString()}</p>
          <p className="text-sm font-medium text-purple-500/80">Automação inteligente</p>
        </CardContent>
      </Card>

      <Card className="glass-card animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gray-500/20 rounded-lg border border-gray-500/30">
              <MessageCircle className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="font-semibold text-lg">Sem IA</h3>
          </div>
          <p className="text-4xl font-bold text-gray-500">{totalSemIA.toLocaleString()}</p>
          <p className="text-sm font-medium text-gray-500/80">Envios manuais</p>
        </CardContent>
      </Card>

      <Card className="glass-card animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-lg">Agendadas</h3>
          </div>
          <p className="text-4xl font-bold text-blue-500">{agendadasCount.toLocaleString()}</p>
          <p className="text-sm font-medium text-blue-500/80">Mensagens futuras</p>
        </CardContent>
      </Card>

      <Card className="glass-card animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-500/20 rounded-lg border border-orange-500/30">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="font-semibold text-lg">Msg. na Fila</h3>
          </div>
          <p className="text-4xl font-bold text-orange-500">{filaCount.toLocaleString()}</p>
          <p className="text-sm font-medium text-orange-500/80">Aguardando envio</p>
        </CardContent>
      </Card>

      <Card className="glass-card animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <MessageSquare className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg">Respondidas</h3>
          </div>
          <p className="text-4xl font-bold text-green-500">{totalResponded.toLocaleString()}</p>
          <p className="text-sm font-medium text-green-500/80">{responseRate.toFixed(1)}% de resposta</p>
        </CardContent>
      </Card>
    </div>
  );
};