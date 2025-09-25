"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiSettingsStore } from "@/store/apiSettingsStore";
import { showSuccess, showError } from "@/utils/toast";
import { Save, Link, Settings } from 'lucide-react';

const ApiSettings = () => {
  const { apiBaseUrl, endpoints, setApiBaseUrl, setEndpoint } = useApiSettingsStore();
  const [currentBaseUrl, setCurrentBaseUrl] = useState(apiBaseUrl);
  const [currentEndpoints, setCurrentEndpoints] = useState(endpoints);

  const handleSaveBaseUrl = () => {
    if (!currentBaseUrl.trim()) {
      showError("A URL base da API não pode ser vazia.");
      return;
    }
    setApiBaseUrl(currentBaseUrl);
    showSuccess("URL base da API salva com sucesso!");
  };

  const handleSaveEndpoint = (key: keyof typeof endpoints) => {
    if (!currentEndpoints[key].trim()) {
      showError(`A URL para ${key} não pode ser vazia.`);
      return;
    }
    setEndpoint(key, currentEndpoints[key]);
    showSuccess(`Endpoint '${key}' salvo com sucesso!`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações da API" subtitle="Gerencie os endpoints da sua API" />

      <Card className="glass-card animate-slide-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" /> URL Base da API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-base-url">URL Base</Label>
            <Input
              id="api-base-url"
              value={currentBaseUrl}
              onChange={(e) => setCurrentBaseUrl(e.target.value)}
              placeholder="Ex: https://seuservidor.com/api"
            />
          </div>
          <Button onClick={handleSaveBaseUrl} className="btn-premium">
            <Save className="mr-2 h-4 w-4" /> Salvar URL Base
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Endpoints Específicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(endpoints).map(([key, value]) => (
            <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`endpoint-${key}`}>{key.replace(/_/g, ' ')}</Label>
                <Input
                  id={`endpoint-${key}`}
                  value={currentEndpoints[key as keyof typeof endpoints]}
                  onChange={(e) => setCurrentEndpoints(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Ex: ${apiBaseUrl}/${key.toLowerCase()}`}
                />
              </div>
              <Button onClick={() => handleSaveEndpoint(key as keyof typeof endpoints)} className="btn-premium w-full">
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiSettings;