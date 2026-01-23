"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Image as ImageIcon, Paperclip, Mic } from "lucide-react";
import { useDisparadorStore } from "../../store/disparadorStore";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const HighlightTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, value, onChange, onSelect, ...props }, ref) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => textareaRef.current!);

  const handleScroll = () => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const renderHighlights = (text: string) => {
    if (!text) return null;
    return text.split(/(@[\wÀ-ÿ]+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-green-600 font-bold bg-green-500/10 rounded-[2px] inline-block">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn("relative group", className)}>
      <div
        ref={backdropRef}
        className="absolute inset-0 px-3 py-2 whitespace-pre-wrap break-words pointer-events-none font-sans text-sm leading-[1.5] overflow-hidden text-foreground bg-transparent"
        aria-hidden="true"
      >
        {renderHighlights(value as string)}
        {/* Trailing break to ensure height match if ends with newline */}
        {(value as string)?.endsWith('\n') && <br />}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onSelect={onSelect}
        onScroll={handleScroll}
        className="relative block w-full h-full px-3 py-2 bg-transparent text-transparent caret-foreground font-sans text-sm leading-[1.5] resize-none focus:outline-none border-0 ring-0 focus:ring-0 scrollbar-hide"
        spellCheck={false}
        {...props}
      />
    </div>
  );
});
HighlightTextarea.displayName = "HighlightTextarea";

interface MessageCreatorProps {
  templates: any[];
  setTemplates: (templates: any[]) => void;
  variables: string[];
}

export const MessageCreator = ({ templates, setTemplates, variables }: MessageCreatorProps) => {
  const { mediaUpload } = useDisparadorStore();
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState(0);

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
    return text.replace(/(@[\wÀ-ÿ]+)/g, (match) => `<span class="bg-blue-200 text-blue-800 px-1 rounded">${match}</span>`);
  };

  const insertVariable = (variable: string, index: number) => {
    const currentText = templates[index].text;
    const before = currentText.slice(0, cursorPos - 1); // remove the '@'
    const after = currentText.slice(cursorPos);
    // Use format @variable without brackets
    const newText = `${before}@${variable}${after}`;

    updateTemplate(index, { ...templates[index], text: newText });
    setMenuOpenIndex(null);
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
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={menuOpenIndex === index} onOpenChange={(open) => !open && setMenuOpenIndex(null)}>
                  <PopoverAnchor asChild>
                    <HighlightTextarea
                      placeholder={template.type === 'texto' ? "Digite sua mensagem... (Use @ para variáveis)" : "Digite a legenda (opcional)... (Use @ para variáveis)"}
                      value={template.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        const pos = e.target.selectionStart;
                        updateTemplate(index, { ...template, text: val });
                        setCursorPos(pos);
                        if (val.charAt(pos - 1) === '@') {
                          setMenuOpenIndex(index);
                        }
                      }}
                      onSelect={(e) => {
                        // Update cursor pos on select/click too to ensure correct insert position
                        setCursorPos(e.currentTarget.selectionStart);
                      }}
                      className="mt-2 min-h-[100px] w-full rounded-md border border-input bg-background/50 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                    />
                  </PopoverAnchor>
                  <PopoverContent className="w-[200px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <Command>
                      <CommandList>
                        <CommandGroup heading="Variáveis Disponíveis">
                          {variables.map(v => (
                            <CommandItem key={v} onSelect={() => insertVariable(v, index)}>
                              <span>{v}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {(template.type === 'imagem' || template.type === 'video') && (
                  <div className="space-y-3 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Upload de Arquivo</Label>
                      <Input
                        type="file"
                        accept={template.type === 'imagem' ? "image/*" : "video/*"}
                        onChange={(e) => handleFileChange(e, index)}
                        className="cursor-pointer"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">ou URL direta</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Link da Mídia (URL)</Label>
                      <Input
                        type="text"
                        placeholder="https://exemplo.com/midia.mp4"
                        value={template.mediaUrl || ''}
                        onChange={(e) => updateTemplate(index, { ...templates[index], mediaUrl: e.target.value })}
                      />
                    </div>
                  </div>
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
                        {template.type === 'video' && (
                          <div className="w-full h-40 bg-black/10 rounded-md mb-1 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
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
    </Card >
  );
};