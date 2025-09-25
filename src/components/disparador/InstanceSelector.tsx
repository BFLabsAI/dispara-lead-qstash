"use client";

import { InstanceCard } from "./InstanceCard";

interface InstanceSelectorProps {
  instances: { name: string; connectionStatus: string }[];
  selectedInstances: string[];
  onSelectionChange: (selected: string[]) => void;
}

export const InstanceSelector = ({ instances, selectedInstances, onSelectionChange }: InstanceSelectorProps) => {
  const handleSelection = (name: string) => {
    const newSelected = selectedInstances.includes(name)
      ? selectedInstances.filter((s) => s !== name)
      : [...selectedInstances, name];
    onSelectionChange(newSelected);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {instances.map((instance) => (
        <InstanceCard
          key={instance.name}
          instance={instance}
          isSelected={selectedInstances.includes(instance.name)}
          onClick={() => handleSelection(instance.name)}
        />
      ))}
       {instances.length === 0 && (
        <p className="text-muted-foreground col-span-full text-center py-4">
          Nenhuma instância conectada encontrada.
        </p>
      )}
    </div>
  );
};