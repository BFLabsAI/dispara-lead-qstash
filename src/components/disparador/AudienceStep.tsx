"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadCloud, Users, Phone, X } from "lucide-react";
import { useDisparadorStore } from "../../store/disparadorStore";

interface AudienceStepProps {
  variables: string[];
  onUpload: (variables: string[]) => void;
}

export const AudienceStep = ({ variables, onUpload }: AudienceStepProps) => {
  const { uploadFile, contatos } = useDisparadorStore();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [manualContacts, setManualContacts] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const { variables: newVariables } = await uploadFile(file);
    onUpload(newVariables);
    setIsUploading(false);
    setFile(null);
  };

  const handleManualContacts = () => {
    const contacts = manualContacts.split('\n').map(c => c.trim()).filter(c => c);
    // Aqui você processaria os contatos manuais
    console.log('Contatos manuais:', contacts);
  };

  return (
    <Card className="glass-card rounded-2xl border border-green-200/50 dark:border-green-500/30 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-green-500/20 rounded-xl border border-green-500/30 animate-pulse-glow">
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Passo 2: Seu Público</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload de Arquivo */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <UploadCloud className="h-4 w-4" /> Carregar Lista de Contatos
            </Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center bg-white/50 dark:bg-gray-800/50">
              <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <UploadCloud className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-600 dark:text-green-400 font-medium">Clique para escolher</span> ou arraste o arquivo
                  </p>
                  <p className="text-xs text-gray-500">Apenas arquivos XLSX ou XLS</p>
                </div>
              </label>
              {file && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 truncate">{file.name}</p>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={handleUpload} disabled={isUploading} className="w-full mt-2">
                    {isUploading ? "Processando..." : "Carregar Arquivo"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Digitação Manual */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Phone className="h-4 w-4" /> Ou Digitar Manualmente
            </Label>
            <div className="border rounded-xl p-4 bg-white/50 dark:bg-gray-800/50">
              <Textarea 
                placeholder="Digite os números de telefone, um por linha. Ex:+5511999998888" 
                value={manualContacts}
                onChange={(e) => setManualContacts(e.target.value)}
                className="min-h-[150px] bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600"
              />
              <Button onClick={handleManualContacts} className="w-full mt-2">
                Adicionar Contatos
              </Button>
            </div>
          </div>
        </div>

        {/* Variáveis Disponíveis */}
        {variables.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mb-3">
              <Users className="h-4 w-4" /> Variáveis Disponíveis
            </Label>
            <ScrollArea className="h-24 w-full">
              <div className="flex flex-wrap gap-2">
                {variables.map((key) => (
                  <Badge key={key} variant="secondary" className="cursor-pointer bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300 border-green-200 dark:border-green-600">
                    {`{${key}}`}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};