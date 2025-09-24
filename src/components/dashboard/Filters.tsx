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
      <CardContent className="p-8"> {/* Increased padding */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-5 w-5 text-green-400" />
          <h3 className="font-bold text-xl gradient-text">Filtros Avançados</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end"> {/* Better grid */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-300 font-medium">
              <i className="fas fa-server text-green-400"></i> Instância
            </Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className="glass-card border-white/20 bg-black/20 text-white h-12">
                <SelectValue placeholder="Todas as instâncias" />
              </SelectTrigger>
              <SelectContent className="glass-card bg-black/20 border-white/20 max-h-96">
                <SelectItem value="all" className="text-white hover:bg-green-500/20">Todas</SelectItem>
                {/* Add dynamic instances if needed */}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-300 font-medium">
              <i className="fas fa-tag text-green-400"></i> Tipo
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="glass-card border-white/20 bg-black/20 text-white h-12">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className="glass-card bg-black/20 border-white/20 max-h-96">
                <SelectItem value="all" className="text-white hover:bg-green-500/20">Todos</SelectItem>
                <SelectItem value="texto" className="text-white hover:bg-green-500/20">Texto</SelectItem>
                <SelectItem value="imagem" className="text-white hover:bg-green-500/20">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label className="flex items-center gap-2 text-gray-300 font-medium">
              <CalendarIcon className="h-4 w-4 text-green-400" />
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="glass-card w-full justify-start text-left h-12 border-white/20 bg-black/20 text-white hover:bg-green-500/10">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                      </>
                    ) : (
                      format(dateRange.from, "PPP")
                    )
                  ) : (
                    <span className="text-gray-400">Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="glass-card w-auto p-0 border-white/20 bg-black/20 max-w-none" align="start">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className="rounded-md border-0" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-3 md:col-span-1">
            <Button 
              variant="outline" 
              onClick={handleReset} 
              className="glass-card w-full h-12 border-white/20 bg-black/20 text-gray-300 hover:bg-red-500/20 hover:text-red-400"
            >
              <i className="fas fa-times mr-2"></i> Limpar
            </Button>
            <Button 
              onClick={handleApply} 
              className="btn-premium w-full h-12 gradient-primary text-white shadow-lg"
            >
              <i className="fas fa-search mr-2"></i> Aplicar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};