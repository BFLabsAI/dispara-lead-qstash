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
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up mb-12 section-mb">
      <CardContent className="p-8">
        <div className="mb-6">
          <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-3"></div>
          <div className="flex items-center gap-2">
            <Filter className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            <h3 className={`font-bold text-xl ${isDark ? 'gradient-text' : 'text-gray-900'}`}>Filtros Avançados</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <Label className={`flex items-center gap-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <i className={`fas fa-server ${isDark ? 'text-green-400' : 'text-green-600'}`}></i> Instância
            </Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className={`glass-card h-12 ${isDark ? 'border-white/20 bg-black/20 text-white' : 'filter-select'}`}>
                <SelectValue placeholder="Todas as instâncias" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-96 ${isDark ? 'bg-black/20 border-white/20' : 'bg-white border-green-200'}`}>
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Todas</SelectItem>
                {/* Add dynamic instances if needed */}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={`flex items-center gap-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <i className={`fas fa-tag ${isDark ? 'text-green-400' : 'text-green-600'}`}></i> Tipo
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className={`glass-card h-12 ${isDark ? 'border-white/20 bg-black/20 text-white' : 'filter-select'}`}>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-96 ${isDark ? 'bg-black/20 border-white/20' : 'bg-white border-green-200'}`}>
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Todos</SelectItem>
                <SelectItem value="texto" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Texto</SelectItem>
                <SelectItem value="imagem" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label className={`flex items-center gap-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <CalendarIcon className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`glass-card w-full justify-start text-left h-12 ${isDark ? 'border-white/20 bg-black/20 text-white hover:bg-green-500/10' : 'filter-select border-green-200 hover:border-green-400'}`}>
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                      </>
                    ) : (
                      format(dateRange.from, "PPP")
                    )
                  ) : (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`glass-card w-auto p-0 ${isDark ? 'border-white/20 bg-black/20 max-w-none' : 'bg-white border-green-200'}`} align="start">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className="rounded-md border-0" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-3 md:col-span-1">
            <Button 
              variant="outline" 
              onClick={handleReset} 
              className={`glass-card w-full h-12 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 ${isDark ? 'border-white/20 bg-black/20 text-gray-300 hover:bg-red-500/20 hover:text-red-400' : ''}`}
            >
              <i className="fas fa-times mr-2"></i> Limpar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleApply} 
              className={`w-full h-12 border-2 border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 font-semibold shadow-md ${isDark ? 'border-green-400 text-green-300 hover:bg-green-500/20' : ''}`}
            >
              <i className="fas fa-search mr-2"></i> Aplicar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};