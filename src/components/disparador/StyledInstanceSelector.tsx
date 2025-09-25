"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Server } from "lucide-react";

interface Instance {
  name: string;
  connectionStatus: string;
}

interface StyledInstanceSelectorProps {
  instances: Instance[];
  selectedInstances: string[];
  onSelectionChange: (selected: string[]) => void;
}

export const StyledInstanceSelector = ({ instances, selectedInstances, onSelectionChange }: StyledInstanceSelectorProps) => {
  const handleCheckboxChange = (name: string, checked: boolean) => {
    const newSelected = checked 
      ? [...selectedInstances, name] 
      : selectedInstances.filter(s => s !== name);
    onSelectionChange(newSelected);
  };

  const formatInstanceName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const connectedInstances = instances.filter(i => i.connectionStatus === "open" || i.connectionStatus === "connected");

  return (
    <Card className="glass-card rounded-2xl border border-green-200/50 dark:border-green-500/30 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-green-500/20 rounded-xl border border-green-500/30 animate-pulse-glow">
            <Server className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Selecione as Instâncias</h3>
        </div>
        
        <ScrollArea className="h-64 w-full pr-2">
          <div className="space-y-3">
            {connectedInstances.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma instância conectada.</p>
              </div>
            ) : (
              connectedInstances.map((instance) => (
                <div 
                  key={instance.name}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedInstances.includes(instance.name)
                      ? 'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/50 shadow-sm'
                      : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70'
                  }`}
                  onClick={() => handleCheckboxChange(instance.name, !selectedInstances.includes(instance.name))}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedInstances.includes(instance.name)}
                      onChange={(checked) => handleCheckboxChange(instance.name, !!checked)}
                      className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatInstanceName(instance.name)}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Conectada
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};