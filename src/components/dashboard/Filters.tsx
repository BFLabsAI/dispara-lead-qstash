"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
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
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up max-w-7xl mx-auto">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end max-w-full"> {/* Added max-w-full */}
          <div>
            <Label className="flex items-center gap-2 text-gray-300">Instância</Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger className="glass-card border-gray-700 bg-gray-900/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card bg-gray-900/90 border-gray-700 max-h-96"> {/* Limited height */}
                <SelectItem value="all" className="text-white hover:bg-gray-800/50">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-2 text-gray-300">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="glass-card border-gray-700 bg-gray-900/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card bg-gray-900/90 border-gray-700 max-h-96">
                <SelectItem value="all" className="text-white hover:bg-gray-800/50">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1">
            <Label className="flex items-center gap-2 text-gray-300">Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="glass-card w-full justify-start text-left font-normal border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800/50">
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
              <PopoverContent className="glass-card w-auto p-0 border-gray-700 bg-gray-900/90 max-w-none" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="text-white"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-3 md:col-span-1">
            <Button 
              variant="outline" 
              onClick={handleReset} 
              className="glass-card w-full border-gray-700 hover:bg-gray-800/50 text-gray-300"
            >
              <i className="fas fa-arrow-rotate-left mr-2"></i>Limpar
            </Button>
            <Button 
              onClick={handleApply} 
              className="btn-premium w-full gradient-success text-white"
            >
              <i className="fas fa-check mr-2"></i>Aplicar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};