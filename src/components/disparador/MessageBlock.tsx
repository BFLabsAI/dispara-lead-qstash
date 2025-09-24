"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDisparadorStore } from "../../store/disparadorStore";

interface MessageBlockProps {
  index: number;
  onUpdate: (template: any) => void;
}

export const MessageBlock = ({ index, onUpdate }: MessageBlockProps) => {
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

  const previewText = text.replace(/\{(\w+)\}/g, (match, _key) => `<span class="bg-green-100 text-green-800 px-1 rounded">${match}</span>`);

  useEffect(() => {
    onUpdate({ type, text, mediaUrl });
  }, [type, text, mediaUrl, onUpdate]);

  return (
    <Card className="bg-muted">
      <CardContent className="p-4">
        <Label className="font-semibold flex items-center gap-2 mb-2">
          <i className="bi bi-chat-square-text"></i>Mensagem {index + 1}
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
            {mediaUrl && <p className="text-sm text-green-600 mt-1">Upload concluído: {mediaUrl}</p>}
          </div>
        )}
        <Label className="flex items-center gap-1 mb-1">
          <i className="bi bi-eye"></i>Preview
        </Label>
        <div
          className="p-3 border rounded bg-background min-h-[60px] whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: previewText }}
        />
      </CardContent>
    </Card>
  );
};