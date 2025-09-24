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

  return (
    <Card className="glass-card animate-slide-in-up mb-6 gradient-primary text-white shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-bold text-xl">Filtros Avançados</h3>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1.5">
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
          
          <div className="flex-1 min-w-[200px] space-y-1.5">
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
          
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <CalendarIcon className="h-4 w-4" /> Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal bg-white/10 border-white/20 hover:bg-white/20 text-white"
                >
                  {dateRange?.from ? format(dateRange.from, "LLL dd, y") : <span>Selecionar período</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateRange?.from} onSelect={(day) => setDateRange({from: day, to: day})} />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={handleReset} 
            className="h-10 w-10 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};