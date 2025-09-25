"use client";

import { useState, useRef } from "react";
import { useDisparadorStore } from "../../store/disparadorStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle, FileText } from "lucide-react";
import { showError } from "@/utils/toast";

interface ContactUploaderProps {
  onUpload: (variables: string[]) => void;
}

export const ContactUploader = ({ onUpload }: ContactUploaderProps) => {
  const { uploadFile, contatos } = useDisparadorStore();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);
    try {
      const { variables } = await uploadFile(file);
      onUpload(variables);
    } catch (err) {
      showError("Falha ao processar o arquivo.");
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
      <div className="mx-auto h-12 w-12 text-muted-foreground">
        <UploadCloud size={48} />
      </div>
      <Label htmlFor="file-upload" className="font-semibold text-lg">Arraste ou selecione seu arquivo</Label>
      <p className="text-sm text-muted-foreground">Suporte para arquivos .xlsx ou .xls</p>
      <Input
        id="file-upload"
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
        <FileText className="h-4 w-4 mr-2" />
        {isUploading ? "Processando..." : "Escolher Arquivo"}
      </Button>
      {fileName && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-5 w-5" />
          <p>
            <span className="font-bold">{contatos.length}</span> contatos carregados de <span className="italic">{fileName}</span>.
          </p>
        </div>
      )}
    </div>
  );
};