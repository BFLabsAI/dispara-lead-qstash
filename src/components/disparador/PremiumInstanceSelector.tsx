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

  const connectedInstances = instances.filter(i => i.connectionStatus === "open" || i.connectionStatus === "connected");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {connectedInstances.map(instance => {
        const isSelected = selectedInstances.includes(instance.name);
        return (
          <Card
            key={instance.name}
            onClick={() => handleSelect(instance.name)}
            className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-primary/50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <Server className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className="font-semibold truncate flex-1">{formatInstanceName(instance.name)}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-green-600 mt-2">
              <CheckCircle className="h-4 w-4" />
              <span>Conectado</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};