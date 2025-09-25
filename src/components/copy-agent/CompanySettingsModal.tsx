"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCopyAgentStore, CompanySettings } from '@/store/copyAgentStore';
import { Save, Building, Briefcase, Volume2, Users, DollarSign, Clock, MessageSquare, Image as ImageIcon, Video, Mic, FileText, Target } from 'lucide-react'; // Added Target
import { ScrollArea } from '@/components/ui/scroll-area';
import { showError } from '@/utils/toast';

interface CompanySettingsModalProps {
  isOpen: boolean;
}

const MARKET_SEGMENTS = [
  "E-commerce", "Consultoria", "Curso Online", "SaaS", "Imobiliária", "Academia", "Serviços Financeiros", "Saúde e Bem-estar", "Automotivo", "Varejo", "Tecnologia", "Educação", "Alimentos e Bebidas", "Turismo", "Outro"
];
const COMPANY_SIZES = ["Startup", "PME", "Grande Empresa"];
const BRAND_VOICES = ["Formal", "Casual", "Amigável", "Autoritativo", "Educativo", "Inovador", "Empático"];
const BRAND_PERSONALITIES = ["Jovem", "Séria", "Inovadora", "Tradicional", "Disruptiva", "Confiável", "Divertida"];
const PREFERRED_LANGUAGES = ["Técnica", "Simples", "Persuasiva", "Consultiva", "Direta", "Inspiradora"];
const AVERAGE_TICKETS = ["Até R$100", "R$100-500", "R$500-2k", "R$2k-10k", "+R$10k"];
const SALES_CYCLES = ["Imediato", "1-7 dias", "1-4 semanas", "+1 mês"];
const AGE_RANGES = ["18-25", "26-35", "36-45", "46-60", "+60"];
const SOCIAL_CLASSES = ["A", "B", "C", "D", "E"];
const PRIMARY_GOALS = ["Vendas", "Leads", "Agendamentos", "Retenção", "Reativação", "Engajamento", "Suporte"];
const MEDIA_TYPES = ["Texto", "Imagem", "Vídeo", "Áudio", "Documento"];

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

  useEffect(() => {
    if (companySettings) {
      setSettings(companySettings);
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

  const handleMediaTypesChange = (type: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      whatsappPreferences: {
        ...prev.whatsappPreferences,
        mediaTypes: checked
          ? [...prev.whatsappPreferences.mediaTypes, type]
          : prev.whatsappPreferences.mediaTypes.filter(t => t !== type),
      },
    }));
  };

  const handleSave = async () => {
    if (!settings.companyName.trim() || !settings.marketSegment.trim() || !settings.brandVoice.trim() || !settings.mainProducts.trim() || !settings.mainPersona.trim() || !settings.primaryGoal.trim()) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    await saveCompanySettings(settings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeCompanySettingsModal}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Building className="h-6 w-6" /> Configurações da Empresa
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            {/* 1. Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="h-5 w-5 text-muted-foreground" /> Informações Básicas</h3>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa <span className="text-destructive">*</span></Label>
                <Input id="companyName" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} placeholder="Ex: DisparaLead Solutions" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketSegment">Segmento de Mercado <span className="text-destructive">*</span></Label>
                <Select value={settings.marketSegment} onValueChange={v => handleChange('marketSegment', v)}>
                  <SelectTrigger id="marketSegment"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MARKET_SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companySize">Tamanho da Empresa</Label>
                <Select value={settings.companySize} onValueChange={v => handleChange('companySize', v)}>
                  <SelectTrigger id="companySize"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. Identidade de Marca */}
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
                <Label htmlFor="preferredLanguage">Linguagem Preferida</Label>
                <Select value={settings.preferredLanguage} onValueChange={v => handleChange('preferredLanguage', v)}>
                  <SelectTrigger id="preferredLanguage"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PREFERRED_LANGUAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3. Produtos/Serviços */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-muted-foreground" /> Produtos/Serviços</h3>
              <div className="space-y-2">
                <Label htmlFor="mainProducts">Principais Produtos/Serviços <span className="text-destructive">*</span></Label>
                <Textarea id="mainProducts" value={settings.mainProducts} onChange={e => handleChange('mainProducts', e.target.value)} placeholder="Ex: Software de automação de WhatsApp, Consultoria de marketing digital" maxLength={500} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="averageTicket">Ticket Médio</Label>
                <Select value={settings.averageTicket} onValueChange={v => handleChange('averageTicket', v)}>
                  <SelectTrigger id="averageTicket"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {AVERAGE_TICKETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesCycle">Ciclo de Venda</Label>
                <Select value={settings.salesCycle} onValueChange={v => handleChange('salesCycle', v)}>
                  <SelectTrigger id="salesCycle"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SALES_CYCLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 4. Público-Alvo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground" /> Público-Alvo</h3>
              <div className="space-y-2">
                <Label htmlFor="mainPersona">Persona Principal <span className="text-destructive">*</span></Label>
                <Textarea id="mainPersona" value={settings.mainPersona} onChange={e => handleChange('mainPersona', e.target.value)} placeholder="Ex: Donos de PMEs, 30-50 anos, buscam escalar vendas online" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageRange">Faixa Etária Predominante</Label>
                <Select value={settings.ageRange} onValueChange={v => handleChange('ageRange', v)}>
                  <SelectTrigger id="ageRange"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialClass">Classe Social</Label>
                <Select value={settings.socialClass} onValueChange={v => handleChange('socialClass', v)}>
                  <SelectTrigger id="socialClass"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SOCIAL_CLASSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 5. Objetivos de Marketing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-muted-foreground" /> Objetivos de Marketing</h3>
              <div className="space-y-2">
                <Label htmlFor="primaryGoal">Meta Principal <span className="text-destructive">*</span></Label>
                <Select value={settings.primaryGoal} onValueChange={v => handleChange('primaryGoal', v)}>
                  <SelectTrigger id="primaryGoal"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PRIMARY_GOALS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seasonality">Sazonalidade (Ex: Black Friday, Natal)</Label>
                <Input id="seasonality" value={settings.seasonality} onChange={e => handleChange('seasonality', e.target.value)} placeholder="Ex: Black Friday, Natal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainCompetitors">Concorrentes Principais (Opcional)</Label>
                <Input id="mainCompetitors" value={settings.mainCompetitors} onChange={e => handleChange('mainCompetitors', e.target.value)} placeholder="Ex: Concorrente A, Concorrente B" />
              </div>
            </div>

            {/* 6. Especificidades WhatsApp */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-muted-foreground" /> Especificidades WhatsApp</h3>
              <div className="space-y-2">
                <Label htmlFor="preferredSendTimes">Horários de Envio Preferenciais</Label>
                <Input id="preferredSendTimes" value={settings.whatsappPreferences.preferredSendTimes} onChange={e => handleChange('whatsappPreferences.preferredSendTimes', e.target.value)} placeholder="Ex: 09h-12h e 14h-17h" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxContactFrequency">Frequência Máxima de Contato</Label>
                <Input id="maxContactFrequency" value={settings.whatsappPreferences.maxContactFrequency} onChange={e => handleChange('whatsappPreferences.maxContactFrequency', e.target.value)} placeholder="Ex: 1x por semana, 3x por mês" />
              </div>
              <div className="space-y-2">
                <Label>Tipos de Mídia Utilizados</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MEDIA_TYPES.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Switch
                        id={`media-${type}`}
                        checked={settings.whatsappPreferences.mediaTypes.includes(type)}
                        onCheckedChange={(checked) => handleMediaTypesChange(type, checked)}
                      />
                      <Label htmlFor={`media-${type}`} className="flex items-center gap-1">
                        {type === 'Texto' && <FileText className="h-4 w-4" />}
                        {type === 'Imagem' && <ImageIcon className="h-4 w-4" />}
                        {type === 'Vídeo' && <Video className="h-4 w-4" />}
                        {type === 'Áudio' && <Mic className="h-4 w-4" />}
                        {type === 'Documento' && <FileText className="h-4 w-4" />}
                        {type}
                      </Label>
                    </div>
                  ))}
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