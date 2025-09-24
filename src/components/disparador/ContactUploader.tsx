"use client";

import { useState } from "react";
import { useDisparadorStore } from "../../store/disparadorStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle } from "lucide-react";

interface ContactUploaderProps {
  onUpload: (variables: string[]) => void;
}

export const ContactUploader = ({ onUpload }: ContactUploaderProps) => {
  const { uploadFile, contatos } = useDisparadorStore();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const { variables } = await uploadFile(file);
    onUpload(variables);
    setIsUploading(false);
    setFile(null); // Reset file input after upload
  };

  return (
    <Card className="bg-muted">
      <CardContent className="p-4 space-y-4">
        <div>
          <Label className="flex items-center gap-2 mb-2 font-semibold">
            <i className="bi bi-file-earmark-arrow-up"></i>
            Carregar Contatos (XLSX)
          </Label>
          <div className="flex gap-2">
            <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="flex-1" />
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              <UploadCloud className="h-4 w-4 mr-2" />
              {isUploading ? "Carregando..." : "Carregar"}
            </Button>
          </div>
        </div>
        {contatos.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-5 w-5" />
            <p>
              <span className="font-bold">{contatos.length}</span> contatos carregados com sucesso.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};