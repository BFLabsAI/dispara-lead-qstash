"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DispatchBlock } from "./DispatchBlock";
import { v4 as uuidv4 } from 'uuid';

interface DispatchConfig {
  id: string;
  datetime: Date | undefined;
  templates: any[];
}

interface MultiDispatchCreatorProps {
  dispatchBlocks: DispatchConfig[];
  setDispatchBlocks: (blocks: DispatchConfig[]) => void;
  variables: string[];
}

export const MultiDispatchCreator = ({
  dispatchBlocks,
  setDispatchBlocks,
  variables
}: MultiDispatchCreatorProps) => {

  const addDispatchBlock = () => {
    if (dispatchBlocks.length < 5) { // Limite de 5 disparos
      setDispatchBlocks([...dispatchBlocks, { id: uuidv4(), datetime: undefined, templates: [{ type: 'texto', text: '', mediaUrl: '' }] }]);
    }
  };

  const removeDispatchBlock = (id: string) => {
    setDispatchBlocks(dispatchBlocks.filter(block => block.id !== id));
  };

  const updateDispatchBlock = (id: string, key: keyof DispatchConfig, value: any) => {
    setDispatchBlocks(dispatchBlocks.map(block =>
      block.id === id ? { ...block, [key]: value } : block
    ));
  };

  return (
    <div className="space-y-6">
      {dispatchBlocks.map((block, index) => (
        <DispatchBlock
          key={block.id}
          dispatchId={block.id}
          dispatchOrder={index + 1}
          datetime={block.datetime}
          setDatetime={(date) => updateDispatchBlock(block.id, 'datetime', date)}
          templates={block.templates}
          setTemplates={(templates) => updateDispatchBlock(block.id, 'templates', templates)}
          onRemove={removeDispatchBlock}
          variables={variables}
        />
      ))}
      {dispatchBlocks.length < 5 && (
        <Button variant="outline" onClick={addDispatchBlock} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Disparo
        </Button>
      )}
    </div>
  );
};