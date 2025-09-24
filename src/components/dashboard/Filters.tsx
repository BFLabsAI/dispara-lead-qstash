"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { useTheme } from "@/context/ThemeContext";

interface FiltersProps {
  onFilterChange: (filters: any) => void;
}

export const Filters = ({ onFilterChange }: FiltersProps) => {
  const { isDark } = useTheme();
  const [instance, setInstance] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  // Auto-apply: chama onFilterChange sempre que estados mudam
  useEffect(() => {
    onFilterChange({ instance, tipo, dateRange });
  }, [instance, tipo, dateRange, onFilterChange]);

  const handleReset = () => {
    setInstance("all");
    setTipo("all");
    setDateRange({ from: undefined, to: undefined });
  };

  // Função para format curto e tooltip full (sem corte rígido)
  const getDateDisplay = (range: DateRange | undefined) => {
    if (!range?.from) return <span className={`${isDark ? 'text-white/80' : 'text-gray-900'}`}>Selecionar período</span>; // Placeholder dark no light
    const fromStr = format(range.from, "MMM d, yyyy"); // Curto: "Sep 1, 2025"
    if (range.to) {
      const toStr = format(range.to, "MMM d, yyyy");
      const fullRange = `${fromStr} - ${toStr}`; // Mostra range completo curto
      return (
        <span 
          className={`truncate block ${isDark ? 'text-white' : 'text-gray-900'}`} 
          title={fullRange} // Tooltip full para hover
        >
          {fullRange} {/* Sem limite chars: truncate cuida do ellipsis se necessário */}
        </span>
      );
    }
    return (
      <span 
        className={`truncate block ${isDark ? 'text-white' : 'text-gray-900'}`} 
        title={fromStr}
      >
        {fromStr}
      </span>
    );
  };

  return (
    <Card className="rounded-2xl card-premium animate-slide-in-up mb-8 bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl border-0"> {/* Sempre gradient verde vibrante, independente de mode */}
      <CardContent className="p-6 text-white"> {/* Sempre text-white para contraste no green */}
        <div className="mb-4">
          <div className="w-12 h-1 rounded-full mb-2 bg-white/30"></div> {/* Top bar white sutil no green */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white" />
            <h3 className="font-bold text-lg text-white drop-shadow-md">Filtros Avançados</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end"> {/* Layout horizontal: 3 filtros + X; gap-3, items-end para alinhar */}
          {/* Instância - Maior espaço (flex-1 min-w-[220px]) */}
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-white/90' : 'text-gray-900'}`}> {/* Label dark no light */}
              <i className={`fas fa-server text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}></i> Instância
            </Label>
            <Select value={instance} onValueChange={(value) => { setInstance(value); }}>
              <SelectTrigger className={`glass-card h-10 bg-white/20 backdrop-blur-sm border-white/30 ${isDark ? 'text-white hover:bg-white/30' : 'text-gray-900 hover:bg-white/50'}`}> {/* Trigger dark no light */}
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-48 bg-white border-green-200 ${isDark ? 'text-white' : 'text-gray-900'}`}> {/* Content com dark text no light */}
                <SelectItem value="all" className={`${isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-green-50'}`}>Todas</SelectItem>
                {/* Add dynamic instances if needed */}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tipo - Mesmo estilo, maior espaço */}
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-white/90' : 'text-gray-900'}`}> {/* Label dark no light */}
              <i className={`fas fa-tag text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}></i> Tipo
            </Label>
            <Select value={tipo} onValueChange={(value) => { setTipo(value); }}>
              <SelectTrigger className={`glass-card h-10 bg-white/20 backdrop-blur-sm border-white/30 ${isDark ? 'text-white hover:bg-white/30' : 'text-gray-900 hover:bg-white/50'}`}> {/* Trigger dark no light */}
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-48 bg-white border-green-200 ${isDark ? 'text-white' : 'text-gray-900'}`}> {/* Content com dark text no light */}
                <SelectItem value="all" className={`${isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-green-50'}`}>Todos</SelectItem>
                <SelectItem value="texto" className={`${isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-green-50'}`}>Texto</SelectItem>
                <SelectItem value="imagem" className={`${isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-green-50'}`}>Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Período - Mesmo estilo, maior espaço, texto curto sem overflow */}
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-white/90' : 'text-gray-900'}`}> {/* Label dark no light */}
              <CalendarIcon className={`h-3 w-3 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`glass-card w-full justify-start text-left h-10 bg-white/20 backdrop-blur-sm border-white/30 ${isDark ? 'text-white hover:bg-white/30' : 'text-gray-900 hover:bg-white/50'}`}> {/* Trigger dark no light */}
                  {getDateDisplay(dateRange)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`glass-card w-auto p-0 bg-white border-green-200 ${isDark ? 'text-white' : 'text-gray-900'}`} align="start"> {/* Content com dark text no light */}
                <Calendar mode="range" selected={dateRange} onSelect={(range) => { setDateRange(range); }} numberOfMonths={2} className="rounded-md border-0" />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Limpar: Ícone X premium gradiente vermelho (não full solid, ícone branco, glow como gráficos) */}
          <Button 
            variant="ghost" 
            onClick={handleReset} 
            className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg border-0 animate-pulse-glow kpi-icon border border-red-500/40" // Gradiente red, white icon, red glow premium
          >
            <X className="h-4 w-4" /> {/* Ícone branco, tamanho médio */}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};