"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Settings, Play, Square } from "lucide-react";

interface FinalStepProps {
  tempoMin: number;
  setTempoMin: (tempo: number) => void;
  tempoMax: number;
  setTempoMax: (tempo: number) => void;
  usarIA: boolean;
  setUsarIA: (use: boolean) => void;
  isSending: boolean;
  onSend: () => void;
  onStop: () => void;
  progress: number;
  status: string;
}

export const FinalStep = ({ 
  tempoMin, setTempoMin, 
  tempoMax, setTempoMax, 
  usarIA, setUsarIA, 
  isSending, onSend, onStop, 
  progress, status 
}: FinalStepProps) => {
  return (
    <Card className="glass-card rounded-2xl border border-green-200/50 dark:border-green-500/30 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-green-500/20 rounded-xl border border-green-500/30 animate-pulse-glow">
            <Settings className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Passo 4: Ajustes Finais</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <Label>Tempo mínimo entre envios (segundos)</Label>
            <Input 
              type="number" 
              value={tempoMin} 
              onChange={(e) => setTempoMin(+e.target.value)} 
              min={1} 
              className="bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div className="space-y-2">
            <Label>Tempo máximo entre envios (segundos)</Label>
            <Input 
              type="number" 
              value={tempoMax} 
              onChange={(e) => setTempoMax(+e.target.value)} 
              min={1} 
              className="bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mb-6">
          <Switch id="usarIA" checked={usarIA} onCheckedChange={setUsarIA} />
          <Label htmlFor="usarIA" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <span>Usar Inteligência Artificial para personalizar mensagens</span>
          </Label>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={onSend} 
            disabled={isSending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando...' : 'Iniciar Disparo'}
          </Button>
          {isSending && (
            <Button variant="destructive" onClick={onStop} className="flex-1">
              <Square className="h-4 w-4 mr-2" />
              Parar Envio
            </Button>
          )}
        </div>
        
        {progress > 0 && (
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground mt-2">{status}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};