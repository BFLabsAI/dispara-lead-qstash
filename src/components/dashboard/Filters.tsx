"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Filter, X, Server, Tag, Megaphone, Users, Palette } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";

interface FiltersProps {
  onFilterChange: (filters: any) => void;
  instanceOptions: string[];
  tipoOptions: string[];
  campaignOptions: string[];
  publicoOptions: string[];
  criativoOptions: string[];
}

export const Filters = ({ 
  onFilterChange, 
  instanceOptions, 
  tipoOptions,
  campaignOptions,
  publicoOptions,
  criativoOptions
}: FiltersProps) => {
  const [instance, setInstance] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [publico, setPublico] = useState("all");
  const [criativo, setCriativo] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    onFilterChange({ instance, tipo, campaign, publico, criativo, dateRange });
  }, [instance, tipo, campaign, publico, criativo, dateRange, onFilterChange]);

  const handleReset = () => {
    setInstance("all");
    setTipo("all");
    setCampaign("all");
    setPublico("all");
    setCriativo("all");
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <Card className="glass-card animate-slide-in-up mb-6 gradient-primary text-white shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-bold text-xl">Filtros Avançados</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <Server className="h-4 w-4" /> Instância
            </Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {instanceOptions.filter(opt => opt !== "all").map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <Tag className="h-4 w-4" /> Tipo
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tipoOptions.filter(opt => opt !== "all").map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <Megaphone className="h-4 w-4" /> Campanha
            </Label>
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {campaignOptions.filter(opt => opt !== "all").map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <Users className="h-4 w-4" /> Público
            </Label>
            <Select value={publico} onValueChange={setPublico}>
              <SelectTrigger className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {publicoOptions.filter(opt => opt !== "all").map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <Palette className="h-4 w-4" /> Criativo
            </Label>
            <Select value={criativo} onValueChange={setCriativo}>
              <SelectTrigger className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {criativoOptions.filter(opt => opt !== "all").map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              <CalendarIcon className="h-4 w-4" /> Período
            </Label>
            <div className="flex items-end gap-2"> {/* Novo flex container para o Popover e o botão */}
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
              <Button 
                variant="destructive" 
                onClick={handleReset} 
                className="h-10 w-10 p-0 flex-shrink-0"
                title="Limpar Filtros"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};