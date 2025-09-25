"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card"; // Importar Card e CardContent
import { Button } from "@/components/ui/button"; // Importar Button
import { Input } from "@/components/ui/input"; // Importar Input
import { Label } from "@/components/ui/label"; // Importar Label
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Importar Popover
import { Badge } from "@/components/ui/badge"; // Importar Badge
import { Calendar } from "@/components/ui/calendar";
import { MessageCreator } from "@/components/disparador/MessageCreator";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DispatchBlockProps {
  dispatchId: string;
  dispatchOrder: number;
  datetime: Date | undefined;
  setDatetime: (date: Date | undefined) => void;
  templates: any[];
  setTemplates: (templates: any[]) => void;
  onRemove: (id: string) => void;
  variables: string[]; // Variáveis disponíveis do AudienceDefinition
}

export const DispatchBlock = ({
  dispatchId,
  dispatchOrder,
  datetime,
  setDatetime,
  templates,
  setTemplates,
  onRemove,
  variables
}: DispatchBlockProps) => {

  const handleDateSelect = (date: Date | undefined) => {
    let newDateTime = date;
    if (newDateTime && datetime) {
      // Preserve time if date changes
      newDateTime.setHours(datetime.getHours(), datetime.getMinutes(), 0, 0);
    } else if (newDateTime && !datetime) {
      // If only date is set, default to current time
      const now = new Date();
      newDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
    }
    setDatetime(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value;
    if (!timeString) return;

    const [hours, minutes] = timeString.split(':').map(Number);
    let newDateTime = datetime || new Date(); // Use existing date or current date
    newDateTime.setHours(hours, minutes, 0, 0);
    setDatetime(newDateTime);
  };

  return (
    <Card className="glass-card p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-lg">Disparo {dispatchOrder}</h4>
        <Button variant="destructive" size="icon" onClick={() => onRemove(dispatchId)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Seletor de Data e Hora */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">Data e Hora do Disparo</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !datetime && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {datetime ? format(datetime, "PPP") : "Selecionar Data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={datetime}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={datetime ? format(datetime, "HH:mm") : ""}
            onChange={handleTimeChange}
            className="w-fit"
          />
        </div>
      </div>

      {/* Criador de Mensagens */}
      <MessageCreator templates={templates} setTemplates={setTemplates} />

      {/* Variáveis Disponíveis */}
      {variables.length > 0 && (
        <div className="space-y-2">
          <Label>Variáveis Disponíveis:</Label>
          <div className="flex flex-wrap gap-2">
            {variables.map(v => <Badge key={v}>{`{${v}}`}</Badge>)}
          </div>
        </div>
      )}
    </Card>
  );
};