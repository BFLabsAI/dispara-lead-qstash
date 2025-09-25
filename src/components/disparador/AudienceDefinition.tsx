"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, Users, Keyboard, CheckCircle } from "lucide-react";
import { useDisparadorStore } from "../../store/disparadorStore";

interface AudienceDefinitionProps {
  campaignName: string;
  setCampaignName: (name: string) => void;
  publicTarget: string;
  setPublicTarget: (target: string) => void;
  content: string;
  setContent: (content: string) => void;
  onUpload: (variables: string[]) => void;
}

export const AudienceDefinition = ({
  campaignName, setCampaignName,
  publicTarget, setPublicTarget,
  content, setContent,
  onUpload
}: AudienceDefinitionProps) => {
  const { uploadFile, setContatos, contatos } = useDisparadorStore();
  const [isUploading, setIsUploading] = useState(false);
  const [manualContacts, setManualContacts] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const { variables } = await uploadFile(file);
    onUpload(variables);
    setIsUploading(false);
    e.target.value = '';
  }, [uploadFile, onUpload]);

  const handleManualContacts = () => {
    const contactsArray = manualContacts
      .split(/[\n,]+/)
      .map(c => c.trim())
      .filter(c => c)
      .map(c => ({ telefone: c }));
    setContatos(contactsArray);
  };

  return (
    <Card className="rounded-b-xl border-t-0 glass-card">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Campanha</Label>
            <Input placeholder="Ex: Promoção de Natal" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Público</Label>
            <Input placeholder="Ex: Clientes VIP" value={publicTarget} onChange={e => setPublicTarget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Conteúdo</Label>
            <Input placeholder="Ex: Cupom de desconto" value={content} onChange={e => setContent(e.target.value)} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
          <div className="space-y-2">
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className="w-10 h-10 mb-4 text-primary" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Clique para escolher</span> ou arraste o arquivo</p>
                <p className="text-xs text-muted-foreground">Suporte para arquivos .xlsx ou .xls</p>
              </div>
              <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" disabled={isUploading} />
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col w-full h-48 border-2 border-dashed rounded-lg bg-muted p-4">
              <Label className="flex items-center gap-1.5 mb-2"><Keyboard className="h-4 w-4" /> Ou digite os números</Label>
              <Textarea
                placeholder="5511999998888&#10;5521988887777"
                className="flex-grow resize-none"
                value={manualContacts}
                onChange={e => setManualContacts(e.target.value)}
                onBlur={handleManualContacts}
              />
            </div>
          </div>
        </div>
        {contatos.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 rounded-md border border-green-200">
            <CheckCircle className="h-5 w-5" />
            <p><span className="font-bold">{contatos.length}</span> contatos carregados e prontos para o envio.</p>
          </div>
        )}
      </div>
    </Card>
  );
};