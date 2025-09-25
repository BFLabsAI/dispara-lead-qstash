"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDisparadorStore } from "../../store/disparadorStore";
import { Trash2 } from "lucide-react";

interface MessageBlockProps {
  index: number;
  onUpdate: (index: number, template: any) => void;
  onDelete: (index: number) => void;
}

export const MessageBlock = ({ index, onUpdate, onDelete }: MessageBlockProps) => {
  const [type, setType] = useState<"texto" | "imagem" | "audio" | "video">("texto");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const { mediaUpload } = useDisparadorStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileUrl = await mediaUpload(file);
    if (fileUrl) setMediaUrl(fileUrl);
  };

  useEffect(() => {
    onUpdate(index, { type, text, mediaUrl });
  }, [index, type, text, mediaUrl, onUpdate]);

  return (
    <Card className="bg-muted relative">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => onDelete(index)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <CardContent className="p-4">
        <Label className="font-semibold flex items-center gap-2 mb-2">
          Mensagem {index + 1}
        </Label>
        <Select value={type} onValueChange={(v) => setType(v as any)}>
          <SelectTrigger className="mb-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="texto">Texto</SelectItem>
            <SelectItem value="imagem">Imagem</SelectItem>
            <SelectItem value="audio">Áudio</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          placeholder={type === "texto" ? "Digite sua mensagem..." : "Digite uma legenda (opcional)..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mb-2"
        />
        {type !== "texto" && (
          <div className="mb-2">
            <Input type="file" accept={type === "imagem" ? "image/*" : type === "audio" ? "audio/*" : "video/*"} onChange={handleFileChange} />
            {mediaUrl && <p className="text-sm text-green-600 mt-1">Upload concluído.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};