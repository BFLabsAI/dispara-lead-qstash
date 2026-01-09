"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCopyAgentStore, CompanySettings } from '@/store/copyAgentStore';
import { Save, Building, Briefcase, Volume2, Users, DollarSign } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { showError } from '@/utils/toast';

interface CompanySettingsModalProps {
  isOpen: boolean;
}

const MARKET_SEGMENTS = [
  "E-commerce", "Consultoria", "Curso Online", "SaaS", "Imobiliária", "Academia", "Serviços Financeiros", "Saúde e Bem-estar", "Automotivo", "Varejo", "Tecnologia", "Educação", "Alimentos e Bebidas", "Turismo", "Outro"
];
const COMPANY_SIZES = ["Startup", "Pequena empresa", "Média empresa", "Grande empresa"];
const BRAND_VOICES = ["Formal", "Casual", "Amigável", "Autoritativo", "Educativo", "Inovador", "Empático"];
const BRAND_PERSONALITIES = ["Jovem", "Séria", "Inovadora", "Tradicional", "Disruptiva", "Confiável", "Divertida"];

export const CompanySettingsModal = ({ isOpen }: CompanySettingsModalProps) => {
  const { companySettings, saveCompanySettings, closeCompanySettingsModal } = useCopyAgentStore();
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: '',
    marketSegment: '',
    companySize: '',
    brandVoice: '',
    brandPersonality: '',
    preferredLanguage: '',
    mainProducts: '',
    averageTicket: '',
    valueProposition: '',
    salesCycle: '',
    seasonality: '',
    mainPersona: '',
    ageRange: '',
    socialClass: '',
    primaryGoal: '',
    secondaryGoals: [],
    mainCompetitors: '',
    whatsappPreferences: {
      preferredSendTimes: '',
      maxContactFrequency: '',
      mediaTypes: [],
    },
  });

  const [isCustomSegment, setIsCustomSegment] = useState(false);

  useEffect(() => {
    if (companySettings) {
      setSettings(companySettings);
      const isCustom = companySettings.marketSegment && !MARKET_SEGMENTS.includes(companySettings.marketSegment) && companySettings.marketSegment !== 'Outro';
      setIsCustomSegment(!!isCustom);
    }
  }, [companySettings]);

  const handleChange = (field: keyof CompanySettings | string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else {
      setSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSegmentChange = (value: string) => {
    if (value === 'Outro') {
      setIsCustomSegment(true);
      setSettings(prev => ({ ...prev, marketSegment: '' })); // Clear for input
    } else {
      setIsCustomSegment(false);
      setSettings(prev => ({ ...prev, marketSegment: value }));
    }
  };

  const handleSave = async () => {
    if (!settings.companyName.trim() || (!settings.marketSegment.trim() && !isCustomSegment) || !settings.brandVoice.trim() || !settings.mainProducts.trim() || !settings.mainPersona.trim()) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    await saveCompanySettings(settings);
  };

  // Logic to determine select value for Segment
  const segmentSelectValue = isCustomSegment ? 'Outro' : (MARKET_SEGMENTS.includes(settings.marketSegment) ? settings.marketSegment : '');

  return (
    <Dialog open={isOpen} onOpenChange={closeCompanySettingsModal}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Building className="h-6 w-6" /> Configurações da Empresa
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 p-2">

            {/* Top Section: Basic Info & Brand Identity Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Column 1: Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="h-5 w-5 text-muted-foreground" /> Informações Básicas</h3>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa <span className="text-destructive">*</span></Label>
                  <Input id="companyName" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} placeholder="Ex: DisparaLead Solutions" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketSegment">Segmento de Mercado <span className="text-destructive">*</span></Label>
                  <Select value={segmentSelectValue} onValueChange={handleSegmentChange}>
                    <SelectTrigger id="marketSegment"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MARKET_SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {isCustomSegment && (
                    <Input
                      className="mt-2"
                      placeholder="Digite o seu segmento..."
                      value={settings.marketSegment}
                      onChange={e => handleChange('marketSegment', e.target.value)}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize">Tamanho da Empresa</Label>
                  <Select value={COMPANY_SIZES.includes(settings.companySize) ? settings.companySize : ''} onValueChange={v => handleChange('companySize', v)}>
                    <SelectTrigger id="companySize"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column 2: Identidade de Marca */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Volume2 className="h-5 w-5 text-muted-foreground" /> Identidade de Marca</h3>

                <div className="space-y-2">
                  <Label htmlFor="brandVoice">Tom de Voz <span className="text-destructive">*</span></Label>
                  <Select value={settings.brandVoice} onValueChange={v => handleChange('brandVoice', v)}>
                    <SelectTrigger id="brandVoice"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {BRAND_VOICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandPersonality">Personalidade da Marca</Label>
                  <Select value={settings.brandPersonality} onValueChange={v => handleChange('brandPersonality', v)}>
                    <SelectTrigger id="brandPersonality"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {BRAND_PERSONALITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valueProposition">Proposta de Valor</Label>
                  <Input
                    id="valueProposition"
                    value={settings.valueProposition}
                    onChange={e => handleChange('valueProposition', e.target.value)}
                    placeholder="Ex: O mais rápido do mercado"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Section: Side-by-Side Textareas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Produtos/Serviços */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-muted-foreground" /> Produtos/Serviços</h3>
                <div className="space-y-2">
                  <Label htmlFor="mainProducts">Produtos e Serviços <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground leading-snug">Insira seus produtos, ticket médio, ciclo de venda, etc.</p>
                  <Textarea
                    id="mainProducts"
                    value={settings.mainProducts}
                    onChange={e => handleChange('mainProducts', e.target.value)}
                    placeholder="Descreva detalhadamente seus produtos e estratégia de preços..."
                    className="min-h-[160px] resize-none"
                  />
                </div>
              </div>

              {/* Público-Alvo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground" /> Público-Alvo</h3>
                <div className="space-y-2">
                  <Label htmlFor="mainPersona">Persona Principal <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground leading-snug">Descreva a persona, faixa etária, dores e desejos.</p>
                  <Textarea
                    id="mainPersona"
                    value={settings.mainPersona}
                    onChange={e => handleChange('mainPersona', e.target.value)}
                    placeholder="Ex: Donos de PMEs, 30-50 anos, buscam escalar vendas online..."
                    className="min-h-[160px] resize-none"
                  />
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={closeCompanySettingsModal}>Cancelar</Button>
          <Button onClick={handleSave} className="btn-premium">
            <Save className="mr-2 h-4 w-4" /> Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};