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
    <Card className={`rounded-2xl card-premium animate-slide-in-up mb-8 ${isDark ? 'glass-card' : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl border-0'}`}>
      <CardContent className={`p-6 ${isDark ? '' : 'text-white'}`}> {/* Padding reduzido: p-6 */}
        <div className="mb-4"> {/* Header mais compacto: mb-4 */}
          <div className={`w-12 h-1 rounded-full mb-2 ${isDark ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-white/30'}`}></div> {/* Barra menor: w-12 h-1, mb-2 */}
          <div className="flex items-center gap-2">
            <Filter className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-white'}`} /> {/* Ícone menor: h-4 w-4 */}
            <h3 className={`font-bold text-lg ${isDark ? 'gradient-text' : 'text-white drop-shadow-md'}`}>Filtros Avançados</h3> {/* Título menor: text-lg */}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end justify-between"> {/* Layout horizontal compacto: flex flex-wrap gap-3 (menor que gap-6); items-end para alinhar bottoms; justify-between para distribuir */}
          {/* Instância - Largura flexível, mas compacta */}
          <div className="flex-1 min-w-[200px] space-y-1"> {/* space-y-1 para menos vertical */}
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/90'}`}> {/* Label menor: text-sm, gap-1, mb removido */}
              <i className={`fas fa-server text-xs ${isDark ? 'text-green-400' : 'text-white'}`}></i> Instância
            </Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className={`glass-card h-10 ${isDark ? 'border-white/20 bg-black/20 text-white' : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'}`}> {/* Altura menor: h-10 */}
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-48 ${isDark ? 'bg-black/20 border-white/20' : 'bg-white/90 border-green-200 text-gray-900'}`}> {/* max-h-48 para menor */}
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Todas</SelectItem>
                {/* Add dynamic instances if needed */}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tipo - Mesmo estilo */}
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/90'}`}>
              <i className={`fas fa-tag text-xs ${isDark ? 'text-green-400' : 'text-white'}`}></i> Tipo
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className={`glass-card h-10 ${isDark ? 'border-white/20 bg-black/20 text-white' : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'}`}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className={`glass-card max-h-48 ${isDark ? 'bg-black/20 border-white/20' : 'bg-white/90 border-green-200 text-gray-900'}`}>
                <SelectItem value="all" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Todos</SelectItem>
                <SelectItem value="texto" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Texto</SelectItem>
                <SelectItem value="imagem" className={isDark ? 'text-white hover:bg-green-500/20' : 'text-gray-900 hover:bg-green-50'}>Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Período - Mesmo estilo, popover compacto */}
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/90'}`}>
              <CalendarIcon className={`h-3 w-3 ${isDark ? 'text-green-400' : 'text-white'}`} /> {/* Ícone menor: h-3 w-3 */}
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`glass-card w-full justify-start text-left h-10 ${isDark ? 'border-white/20 bg-black/20 text-white hover:bg-green-500/10' : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'}`}> {/* h-10, estilo glass-card unificado */}
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
          
          {/* Botões - Estilo unificado glass-card, na mesma linha */}
          <div className="flex gap-2 min-w-[180px] space-y-1"> {/* Gap-2 menor; min-w para não encolher demais */}
            <Label className="sr-only">Ações</Label> {/* Label hidden para acessibilidade */}
            <Button 
              variant="outline" 
              onClick={handleReset} 
              className={`glass-card h-10 flex-1 border-2 ${isDark ? 'border-white/20 bg-black/20 text-gray-300 hover:bg-red-500/20 hover:text-red-400' : 'bg-white border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600'}`}
            >
              <i className="fas fa-times mr-1 text-xs"></i> Limpar {/* Ícone menor: text-xs, mr-1 */}
            </Button>
            <Button 
              onClick={handleApply} 
              className={`h-10 flex-1 border-2 ${isDark ? 'border-green-400 text-green-300 hover:bg-green-500/20' : 'bg-white border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 font-semibold shadow-md'}`}
            >
              <i className="fas fa-search mr-1 text-xs"></i> Aplicar {/* Ícone menor */}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};