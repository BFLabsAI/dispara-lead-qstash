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
    if (!range?.from) return <span className={isDark ? 'text-white/80' : 'text-gray-600'}>Selecionar período</span>;
    const fromStr = format(range.from, "MMM d, yyyy");
    if (range.to) {
      const toStr = format(range.to, "MMM d, yyyy");
      const fullRange = `${fromStr} - ${toStr}`;
      return (
        <span 
          className={`truncate block ${isDark ? 'text-white' : 'text-gray-800'}`} 
          title={fullRange}
        >
          {fullRange}
        </span>
      );
    }
    return (
      <span 
        className={`truncate block ${isDark ? 'text-white' : 'text-gray-800'}`} 
        title={fromStr}
      >
        {fromStr}
      </span>
    );
  };

  return (
    <Card className={`rounded-2xl card-premium animate-slide-in-up mb-8 ${
      isDark 
        ? 'bg-gradient-to-br from-green-900 to-emerald-800 shadow-2xl border border-green-700/50' 
        : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl border-0'
    }`}>
      <CardContent className={`p-6 ${isDark ? 'text-white' : 'text-white'}`}>
        <div className="mb-4">
          <div className="w-12 h-1 rounded-full mb-2 bg-white/30"></div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white" />
            <h3 className="font-bold text-lg text-white drop-shadow-md">Filtros Avançados</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Instância */}
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
              <i className={`fas fa-server text-xs ${isDark ? 'text-white' : 'text-gray-600'}`}></i> Instância
            </Label>
            <Select value={instance} onValueChange={(value) => { setInstance(value); }}>
              <SelectTrigger className={`glass-card h-10 ${
                isDark 
                  ? 'bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20' 
                  : 'bg-white/20 backdrop-blur-sm border-green-200 text-gray-800 hover:bg-white/30'
              }`}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-48 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-green-200 text-gray-800'
              }`}>
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-800 hover:bg-green-50'}>Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Tipo */}
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
              <i className={`fas fa-tag text-xs ${isDark ? 'text-white' : 'text-gray-600'}`}></i> Tipo
            </Label>
            <Select value={tipo} onValueChange={(value) => { setTipo(value); }}>
              <SelectTrigger className={`glass-card h-10 ${
                isDark 
                  ? 'bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20' 
                  : 'bg-white/20 backdrop-blur-sm border-green-200 text-gray-800 hover:bg-white/30'
              }`}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-48 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-green-200 text-gray-800'
              }`}>
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-800 hover:bg-green-50'}>Todos</SelectItem>
                <SelectItem value="texto" className={isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-800 hover:bg-green-50'}>Texto</SelectItem>
                <SelectItem value="imagem" className={isDark ? 'text-white hover:bg-gray-700/50' : 'text-gray-800 hover:bg-green-50'}>Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Período */}
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
              <CalendarIcon className={`h-3 w-3 ${isDark ? 'text-white' : 'text-gray-600'}`} />
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`glass-card w-full justify-start text-left h-10 ${
                  isDark 
                    ? 'bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20' 
                    : 'bg-white/20 backdrop-blur-sm border-green-200 text-gray-800 hover:bg-white/30'
                }`}>
                  {getDateDisplay(dateRange)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`glass-card w-auto p-0 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-green-200 text-gray-800'
              }`} align="start">
                <Calendar mode="range" selected={dateRange} onSelect={(range) => { setDateRange(range); }} numberOfMonths={2} className="rounded-md border-0" />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Limpar */}
          <Button 
            variant="ghost" 
            onClick={handleReset} 
            className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg border-0 animate-pulse-glow kpi-icon border border-red-500/40"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};