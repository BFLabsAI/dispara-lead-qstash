"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Image as ImageIcon, Paperclip, Mic } from "lucide-react";
import { useDisparadorStore } from "../../store/disparadorStore";

interface MessageCreatorProps {
  templates: any[];
  setTemplates: (templates: any[]) => void;
}

export const MessageCreator = ({ templates, setTemplates }: MessageCreatorProps) => {
  const { mediaUpload } = useDisparadorStore();

  const addMessage = () => {
    setTemplates([...templates, { type: 'texto', text: '', mediaUrl: '' }]);
  };

  const deleteMessage = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  const updateTemplate = (index: number, newTemplate: any) => {
    const newTemplates = [...templates];
    newTemplates[index] = newTemplate;
    setTemplates(newTemplates);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileUrl = await mediaUpload(file);
    if (fileUrl) {
      updateTemplate(index, { ...templates[index], mediaUrl: fileUrl });
    }
  };

  const previewText = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (match) => `<span class="bg-blue-200 text-blue-800 px-1 rounded">${match}</span>`);
  };

  return (
    <Card className="rounded-b-lg rounded-t-none glass-card">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {templates.map((template, index) => (
            <Card key={index} className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Mensagem {index + 1}</h4>
                  <Button variant="ghost" size="icon" onClick={() => deleteMessage(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Select
                  value={template.type}
                  onValueChange={(v) => updateTemplate(index, { ...template, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder={template.type === 'texto' ? "Digite sua mensagem..." : "Digite a legenda (opcional)..."}
                  value={template.text}
                  onChange={(e) => updateTemplate(index, { ...template, text: e.target.value })}
                  className="mt-2"
                />
                {template.type === 'imagem' && (
                  <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} className="mt-2" />
                )}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addMessage} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Bloco de Mensagem
          </Button>
        </div>
        
        <div className="flex justify-center items-center">
          <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
            <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-gray-900">
              <div className="bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover h-full w-full flex flex-col">
                <div className="flex-grow flex flex-col-reverse p-2 space-y-2 space-y-reverse overflow-y-auto">
                  {templates.slice().reverse().map((template, i) => (
                    <div key={i} className="flex justify-end">
                      <div className="bg-[#dcf8c6] dark:bg-[#054740] text-black dark:text-white rounded-lg p-2 max-w-[80%]">
                        {template.type === 'imagem' && <ImageIcon className="w-full h-auto rounded-md mb-1" />}
                        <p dangerouslySetInnerHTML={{ __html: previewText(template.text) }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 bg-[#f0f0f0] dark:bg-[#202c33] flex items-center gap-2">
                  <Paperclip className="text-muted-foreground" />
                  <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full h-8"></div>
                  <Mic className="text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};