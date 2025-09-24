"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InstanceSelectorProps {
  instances: { name: string; connectionStatus: string }[];
}

export const InstanceSelector = ({ instances }: InstanceSelectorProps) => {
  return (
    <Card className="bg-muted mb-4">
      <CardContent className="p-4">
        <Label className="flex items-center gap-1 mb-3 block">
          <i className="bi bi-check-circle"></i>Instâncias para Disparo (Apenas conectadas)
        </Label>
        <ScrollArea className="h-32 w-full">
          <div className="space-y-2">
            {instances.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma instância conectada.</p>
            ) : (
              instances.map((instance) => (
                <div key={instance.name} className="flex items-center space-x-2">
                  <Checkbox id={`check-${instance.name}`} />
                  <Label htmlFor={`check-${instance.name}`}>{instance.name}</Label>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};