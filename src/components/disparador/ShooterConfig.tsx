"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";
import { useDisparadorStore } from "../../store/disparadorStore";
import { StyledInstanceSelector } from "./StyledInstanceSelector";
import { CampaignStep } from "./CampaignStep";
import { AudienceStep } from "./AudienceStep";
import { MessagesStep } from "./MessagesStep";
import { FinalStep } from "./FinalStep";
import { QrDialog } from "./QrDialog";
import { ErrorDialog } from "./ErrorDialog";

export const ShooterConfig = () => {
  // Estados da página
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [publicTarget, setPublicTarget] = useState("");
  const [content, setContent] = useState("");
  const [qtdMensagens, setQtdMensagens] = useState(1);
  const [tempoMin, setTempoMin] = useState(2);
  const [tempoMax, setTempoMax] = useState(5);
  const [usarIA, setUsarIA] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);

  // Estados da store
  const { instances, contatos, templates, setTemplates, sendMessages, stopSending, loadInstances } = useDisparadorStore();

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleSend = async () => {
    if (selectedInstances.length === 0) return showError("Nenhuma instância selecionada.");
    if (contatos.length === 0) return showError("Nenhum contato fornecido.");
    if (tempoMin < 1 || tempoMax < 1 || tempoMax < tempoMin) return showError("Tempos inválidos.");

    setIsSending(true);
    setProgress(0);
    const result = await sendMessages({
      contatos,
      instances: selectedInstances,
      tempoMin,
      tempoMax,
      usarIA,
      templates,
    });
    setIsSending(false);
    setStatus(result.sucessos + " sucessos, " + result.erros + " erros.");
  };

  const connectedInstances = useMemo(() => 
    instances.filter((i) => i.connectionStatus === "open" || i.connectionStatus === "connected"),
    [instances]
  );

  const steps = [
    { id: 1, name: 'Campanha', component: CampaignStep },
    { id: 2, name: 'Público', component: AudienceStep },
    { id: 3, name: 'Mensagens', component: MessagesStep },
    { id: 4, name: 'Ajustes', component: FinalStep },
  ];

  const nextStep = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const CurrentStepComponent = steps.find(step => step.id === currentStep)?.component;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Navegação por Passos */}
      <div className="flex justify-between mb-8">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium transition-all ${
                currentStep === step.id
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {step.id}
            </button>
            <span className={`ml-2 font-medium ${currentStep === step.id ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>
              {step.name}
            </span>
            {step.id < steps.length && (
              <div className={`w-16 h-1 mx-4 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Conteúdo do Passo Atual */}
      <div className="mb-8">
        {CurrentStepComponent && (
          <CurrentStepComponent
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            publicTarget={publicTarget}
            setPublicTarget={setPublicTarget}
            content={content}
            setContent={setContent}
            variables={variables}
            onUpload={setVariables}
            qtdMensagens={qtdMensagens}
            setQtdMensagens={setQtdMensagens}
            templates={templates}
            setTemplates={setTemplates}
            tempoMin={tempoMin}
            setTempoMin={setTempoMin}
            tempoMax={tempoMax}
            setTempoMax={setTempoMax}
            usarIA={usarIA}
            setUsarIA={setUsarIA}
            isSending={isSending}
            onSend={handleSend}
            onStop={stopSending}
            progress={progress}
            status={status}
          />
        )}
      </div>

      {/* Navegação */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
          Anterior
        </Button>
        {currentStep < steps.length && (
          <Button onClick={nextStep}>
            Próximo
          </Button>
        )}
      </div>

      <QrDialog />
      <ErrorDialog />
    </div>
  );
};