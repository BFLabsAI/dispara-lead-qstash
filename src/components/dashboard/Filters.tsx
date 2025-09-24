"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";

interface FiltersProps {
  onFilterChange: (filters: any) => void;
}

export const Filters = ({ onFilterChange }: FiltersProps) => {
  const [instance, setInstance] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const isDark = document.documentElement.classList.contains('dark');

  const handleReset = () => {
    setInstance("all");
    setTipo("all");
    setDateRange({ from: undefined, to: undefined });
    onFilterChange({ instance: "all", tipo: "all", dateRange: null });
  };

  const handleApply = () => {
    onFilterChange({ instance, tipo, dateRange });
  };

  return (
    <Card className={`rounded-2xl card-premium animate-slide-in-up mb-12 section-mb ${isDark ? 'glass-card' : 'bg-gradient-to-br from-[#10B981] to-[#059669] shadow-2xl border-0'}`}>
      <CardContent className={`p-8 ${isDark ? '' : 'text-white'}`}>
        <div className="mb-6">
          <div className={`w-16 h-1 rounded-full mb-3 ${isDark ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-white/30'}`}></div>
          <div className="flex items-center gap-2">
            <Filter className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-white'}`} />
            <h3 className={`font-bold text-xl ${isDark ? 'gradient-text' : 'text-white drop-shadow-md'}`}>Filtros Avançados</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <Label className={`flex items-center gap-2 font-medium ${isDark ? 'text-gray-300' : 'text-white/90'}`}>
              <i className={`fas fa-server ${isDark ? 'text-green-400' : 'text-white'}`}></i> Instância
            </Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className={`glass-card h-12 ${isDark ? 'border-white/20 bg-black/20 text-white' : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'}`}>
                <SelectValue placeholder="Todas as instâncias" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-96 ${isDark ? 'bg-black/20 border-white/20' : 'bg-white/90 border-green-200 text-gray-900'}`}>
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Todas</SelectItem>
                {/* Add dynamic instances if needed */}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={`flex items-center gap-2 font-medium ${isDark ? 'text-gray-300' : 'text-white/90'}`}>
              <i className={`fas fa-tag ${isDark ? 'text-green-400' : 'text-white'}`}></i> Tipo
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className={`glass-card h-12 ${isDark ? 'border-white/20 bg-black/20 text-white' : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'}`}>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-96 ${isDark ? 'bg-black/20 border-white/20' : 'bg-white/90 border-green-200 text-gray-900'}`}>
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Todos</SelectItem>
                <SelectItem value="texto" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Texto</SelectItem>
                <SelectItem value="imagem" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label className={`flex items-center gap-2 font-medium ${isDark ? 'text-gray-300' : 'text-white/90'}`}>
              <CalendarIcon className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-white'}`} />
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`glass-card w-full justify-start text-left h-12 ${isDark ? 'border-white/20 bg-black/20 text-white hover:bg-green-500/10' : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'}`}>
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                      </>
                    ) : (
                      format(dateRange.from, "PPP")
                    )
                  ) : (
                    <span className={isDark ? 'text-gray-400' : 'text-white/80'}>Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`glass-card w-auto p-0 ${isDark ? 'border-white/20 bg-black/20 max-w-none' : 'bg-white border-green-200 text-gray-900'}`} align="start">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className="rounded-md border-0" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-3 md:col-span-1">
            <Button 
              variant="outline" 
              onClick={handleReset} 
              className={`w-full h-12 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all ${isDark ? 'bg-red-600/80' : ''}`}
            >
              <i className="fas fa-times mr-2"></i> Limpar
            </Button>
            <Button 
              onClick={handleApply} 
              className="w-full h-12 bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl"
            >
              <i className="fas fa-search mr-2"></i> Aplicar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};