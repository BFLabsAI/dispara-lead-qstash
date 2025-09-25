"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle, Server } from "lucide-react";

interface Instance {
  name: string;
  connectionStatus: string;
}

interface PremiumInstanceSelectorProps {
  instances: Instance[];
  selectedInstances: string[];
  onSelectionChange: (selected: string[]) => void;
}

const formatInstanceName = (name: string) => {
  return name
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const PremiumInstanceSelector = ({ instances, selectedInstances, onSelectionChange }: PremiumInstanceSelectorProps) => {
  const handleSelect = (name: string) => {
    const newSelected = selectedInstances.includes(name)
      ? selectedInstances.filter(s => s !== name)
      : [...selectedInstances, name];
    onSelectionChange(newSelected);
  };

  // Garantir que instances seja um array e filtrar instâncias conectadas
  const instancesArray = Array.isArray(instances) ? instances : [];
  const connectedInstances = instancesArray.filter(i => 
    i && i.connectionStatus === "open" || i.connectionStatus === "connected"
  );

  return (
    <Card className="rounded-b-lg rounded-t-none glass-card">
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {connectedInstances.map(instance => {
          const isSelected = selectedInstances.includes(instance.name);
          return (
            <div
              key={instance.name}
              onClick={() => handleSelect(instance.name)}
              className={`p-4 cursor-pointer transition-all duration-200 border-2 rounded-lg ${
                isSelected
                  ? 'bg-green-700 border-green-800 text-white shadow-lg'
                  : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                <Server className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                <h3 className={`font-semibold truncate flex-1 ${isSelected ? 'text-white' : 'text-foreground'}`}>{formatInstanceName(instance.name)}</h3>
              </div>
              <div className={`flex items-center gap-1.5 text-sm mt-2 ${isSelected ? 'text-green-300' : 'text-green-600'}`}>
                <CheckCircle className="h-4 w-4" />
                <span>Conectado</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};