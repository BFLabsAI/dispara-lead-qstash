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

  const handleMultipleDatesSelected = (originBlockId: string, dates: Date[]) => {
    // Encontrar o bloco original
    const originBlock = dispatchBlocks.find(b => b.id === originBlockId);
    if (!originBlock) return;

    // Identificar datas novas (excluindo a data já presente no bloco original, se houver)
    // A logica aqui é: o calendário retorna TODAS as datas selecionadas (incluindo a que já estava).
    // O DispatchBlock já manteve o bloco original "sincronizado" com uma das datas (geralmente a primeira ou a que já estava).
    // Vamos iterar sobre as datas recebidas e para cada uma QUE NÃO SEJA a do bloco original, criar um novo bloco.

    // ATENÇÃO: datas são objetos, comparação direta pode falhar se não forem a mesma referência.
    // Mas o react-day-picker retorna as datas clicadas.
    // Vamos comparar por string de data (dia/mês/ano) para evitar duplicatas de "dia".

    const currentDateStr = originBlock.datetime ? originBlock.datetime.toLocaleDateString() : null;

    // Filtrar datas que não são a do bloco original
    const newDates = dates.filter(d => {
      if (!currentDateStr) return true; // Se não tinha data, todas são candidatas (mas o DispatchBlock vai pegar a primeira para si)
      return d.toLocaleDateString() !== currentDateStr;
    });

    // Se o bloco original estava vazio (sem data), o DispatchBlock pegou a primeira data para ele.
    // Então removemos a primeira data da lista de "novas" se ela for igual a que o DispatchBlock definiu.
    // Mas o DispatchBlock roda o setDatetime localmente antes de chamar o callback?
    // Não, no meu código: 
    // if (dates.length > 1 && onMultipleDates) { onMultipleDates(dates); ... return; }
    // O DispatchBlock atualiza a si mesmo? Ah, eu coloquei "return" no DispatchBlock!
    // Então o DispatchBlock NÃO se atualiza sozinho se tiver multiselect.
    // Espera, vamos rever o DispatchBlock.

    // DispatchBlock:
    // if (dates.length > 1 && onMultipleDates) {
    //   onMultipleDates(dates);
    //   const currentOrFirst = datetime || dates[0];
    //   // ... logica de hora ...
    //   return; 
    // }
    // ELE NÃO CHAMA setDatetime! Então o estado do bloco original NÃO MUDOU ainda no pai.
    // Mas o 'datetime' prop não mudou. 
    // Então precisamos atualizar o array inteiro de blocos: o original E os novos.

    let currentBlocks = [...dispatchBlocks];

    // 1. Atualizar o bloco original com a primeira data válida (se ele não tivesse data)
    // Se ele já tinha data, mantemos ela se ela estiver na lista de selecionados?
    // Se o usuário clicou em OUTRAS datas, a original deve continuar selecionada.
    // O array 'dates' contem TODAS as selecionadas.
    // Vamos assumir que a data "do bloco original" é a primeira da lista 'dates' (ou a que bater com a original).

    // Estratégia simples:
    // O bloco original fica com a primeira data da lista.
    // As outras datas viram novos blocos.

    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0];
    const otherDates = sortedDates.slice(1);

    // Atualizar bloco original
    const updatedOriginBlock = { ...originBlock, datetime: firstDate };

    // Preservar hora do original se existir
    if (originBlock.datetime) {
      updatedOriginBlock.datetime = new Date(firstDate);
      updatedOriginBlock.datetime.setHours(originBlock.datetime.getHours(), originBlock.datetime.getMinutes(), 0, 0);
    } else {
      // Se não tinha hora, setar hora atual
      const now = new Date();
      updatedOriginBlock.datetime = new Date(firstDate);
      updatedOriginBlock.datetime.setHours(now.getHours(), now.getMinutes(), 0, 0);
    }

    // Substituir bloco original na lista
    currentBlocks = currentBlocks.map(b => b.id === originBlockId ? updatedOriginBlock : b);

    // 2. Criar novos blocos para as outras datas
    // Respeitando o limite de 5
    let availableSlots = 5 - currentBlocks.length;

    if (availableSlots <= 0 && otherDates.length > 0) {
      // Já estamos cheios ou lotamos a lista
      // Não adiciona mais.
    }

    for (const date of otherDates) {
      if (availableSlots <= 0) break;

      // Clonar templates do original
      const newTemplates = originBlock.templates.map(t => ({ ...t })); // Deep copy simples para o template

      const newBlockDatetime = new Date(date);
      // Usar mesma hora do original
      newBlockDatetime.setHours(updatedOriginBlock.datetime!.getHours(), updatedOriginBlock.datetime!.getMinutes(), 0, 0);

      currentBlocks.push({
        id: uuidv4(),
        datetime: newBlockDatetime,
        templates: newTemplates
      });

      availableSlots--;
    }

    setDispatchBlocks(currentBlocks);
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
          onMultipleDates={(dates) => handleMultipleDatesSelected(block.id, dates)}
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