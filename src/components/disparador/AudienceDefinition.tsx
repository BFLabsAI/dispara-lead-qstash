"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud } from "lucide-react";
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
  const { uploadFile, setContatos } = useDisparadorStore();
  const [isUploading, setIsUploading] = useState(false);
  const [manualContacts, setManualContacts] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const { variables } = await uploadFile(file);
    onUpload(variables);
    setIsUploading(false);
    e.target.value = ''; // Reset file input
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
    <Card className="border-border">
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Nome da Campanha (Ex: Promoção de Natal)" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
          <Input placeholder="Público (Ex: Clientes VIP)" value={publicTarget} onChange={e => setPublicTarget(e.target.value)} />
        </div>
        <Textarea placeholder="Conteúdo (Ex: Envio de cupom de desconto para clientes...)" value={content} onChange={e => setContent(e.target.value)} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
          <div className="space-y-2">
            <Label>Arraste ou selecione seu arquivo</Label>
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Clique para escolher</span> ou arraste o arquivo</p>
                <p className="text-xs text-muted-foreground">Suporte para arquivos .xlsx ou .xls</p>
              </div>
              <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" />
            </label>
          </div>
          <div className="space-y-2">
            <Label>Ou digite os números (um por linha ou separados por vírgula)</Label>
            <Textarea
              placeholder="5511999998888, 5521988887777"
              className="h-48 resize-none"
              value={manualContacts}
              onChange={e => setManualContacts(e.target.value)}
              onBlur={handleManualContacts}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};