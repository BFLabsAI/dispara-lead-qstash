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
import { DateRange } from "react-day-picker"; // Import DateRange type for range mode

interface FiltersProps {
  onFilterChange: (filters: any) => void;
}

export const Filters = ({ onFilterChange }: FiltersProps) => {
  const [instance, setInstance] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

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
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="flex items-center gap-1">Instância</Label>
            <Select value={instance} onValueChange={setInstance}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {/* Dynamic options */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-1">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {/* Dynamic */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-1">Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? `${format(dateRange.from, "PPP")} ${dateRange.to ? `- ${format(dateRange.to, "PPP")}` : ""}` : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="range" 
                  selected={dateRange} 
                  onSelect={setDateRange} 
                  numberOfMonths={2} 
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Button variant="outline" onClick={handleReset} className="w-full">
              <i className="bi bi-arrow-clockwise mr-1"></i>Limpar
            </Button>
            <Button onClick={handleApply} className="w-full">Aplicar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};