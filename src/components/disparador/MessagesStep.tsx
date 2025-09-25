"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, MessageCircle, Image, Music, Video } from "lucide-react";
import { useDisparadorStore } from "../../store/disparadorStore";

interface MessagesStepProps {
  qtdMensagens: number;
  setQtdMensagens: (qtd: number) => void;
  templates: any[];
  setTemplates: (templates: any[]) => void;
}

export const MessagesStep = ({ qtdMensagens, setQtdMensagens, templates, setTemplates }: MessagesStepProps) => {
  const [mediaUrl, setMediaUrl] = useState("");
  const { mediaUpload } = useDisparadorStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileUrl = await mediaUpload(file);
    if (fileUrl) setMediaUrl(fileUrl);
  };

  const handleTemplateUpdate = (index: number, template: any) => {
    const newTemplates = [...templates];
    newTemplates[index] = template;
    setTemplates(newTemplates);
  };

  const handleDeleteMessage = (index: number) => {
    const newTemplates = templates.filter((_, i) => i !== index);
    setTemplates(newTemplates);
    if (qtdMensagens > newTemplates.length) {
      setQtdMensagens(newTemplates.length);
    }
  };

  const previewText = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (match, _key) => `<span class="bg-green-100 text-green-800 px-1 rounded">${match}</span>`);
  };

  return (
    <Card className="glass-card rounded-2xl border border-green-200/50 dark:border-green-500/30 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/20 rounded-xl border border-green-500/30 animate-pulse-glow">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Passo 3: Crie suas Mensagens</h3>
          </div>
          <Button onClick={() => setQtdMensagens(qtdMensagens + 1)} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Mensagem
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Mensagens */}
          <div className="space-y-4">
            {Array.from({ length: qtdMensagens }).map((_, i) => (
              <Card key={i} className="bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Mensagem {i + 1}</h4>
                    {qtdMensagens > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMessage(i)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  
                  <Select 
                    value={templates[i]?.type || 'texto'} 
                    onValueChange={(v) => handleTemplateUpdate(i, { ...templates[i], type: v })}
                  >
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
                    placeholder={templates[i]?.type === 'texto' ? "Digite sua mensagem..." : "Digite uma legenda (opcional)..."}
                    value={templates[i]?.text || ''}
                    onChange={(e) => handleTemplateUpdate(i, { ...templates[i], text: e.target.value })}
                    className="mb-2"
                  />
                  
                  {templates[i]?.type !== 'texto' && (
                    <div className="mb-2">
                      <Input type="file" accept={templates[i]?.type === 'imagem' ? "image/*" : templates[i]?.type === 'audio' ? "audio/*" : "video/*"} onChange={handleFileChange} />
                      {mediaUrl && <p className="text-sm text-green-600 mt-1">Upload concluído: {mediaUrl}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pré-visualização */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Pré-visualização</h4>
            <div className="relative bg-gray-900 rounded-[40px] p-4 shadow-2xl border-8 border-black h-[600px] overflow-hidden">
              {/* Mockup do iPhone */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-full"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-4 right-6 w-2 h-2 bg-white rounded-full"></div>
              
              {/* Conteúdo do WhatsApp */}
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-3 p-4 border-b border-gray-700">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">W</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">WhatsApp</p>
                    <p className="text-gray-400 text-xs">Online</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {templates.map((template, i) => (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-xs bg-green-500 text-white rounded-2xl rounded-br-none p-3">
                        {template.type === 'texto' && (
                          <p dangerouslySetInnerHTML={{ __html: previewText(template.text) }} />
                        )}
                        {template.type === 'imagem' && (
                          <div>
                            <img src="https://via.placeholder.com/200" alt="Imagem" className="rounded-lg mb-2" />
                            <p dangerouslySetInnerHTML={{ __html: previewText(template.text) }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <MessageCircle className="h-4 w-4" />
                    <span>Digite uma mensagem</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};