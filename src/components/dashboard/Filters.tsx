"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Filter, X, Server, Tag } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    onFilterChange({ instance, tipo, dateRange });
  }, [instance, tipo, dateRange, onFilterChange]);

  const handleReset = () => {
    setInstance("all");
    setTipo("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const getDateDisplay = (range: DateRange | undefined) => {
    if (!range?.from) return <span>Selecionar período</span>;
    const fromStr = format(range.from, "MMM d, yyyy");
    if (range.to) {
      const toStr = format(range.to, "MMM d, yyyy");
      const fullRange = `${fromStr} - ${toStr}`;
      return <span className="truncate block" title={fullRange}>{fullRange}</span>;
    }
    return <span className="truncate block" title={fromStr}>{fromStr}</span>;
  };

  return (
    <Card className="rounded-2xl card-premium animate-slide-in-up mb-8 gradient-primary text-white shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-bold text-xl">Filtros Avançados</h3>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <Server className="h-4 w-4" /> Instância
            </Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <Tag className="h-4 w-4" /> Tipo
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="texto">Texto</SelectItem>
                <SelectItem value="imagem">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <CalendarIcon className="h-4 w-4" /> Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal bg-white/10 border-white/20 hover:bg-white/20 text-white"
                >
                  {getDateDisplay(dateRange)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={handleReset} 
            className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};