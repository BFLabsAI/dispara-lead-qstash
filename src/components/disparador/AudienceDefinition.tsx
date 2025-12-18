"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, Users, Keyboard, CheckCircle, Search, Tag as TagIcon, Save } from "lucide-react";
import { useDisparadorStore } from "../../store/disparadorStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, getTagColor } from "@/lib/utils";
import { audienceService, Audience } from "@/services/audienceService";
import { toast } from "sonner";
import { supabase } from "@/services/supabaseClient";
import { useAdminStore } from "@/store/adminStore";

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
  const impersonatedId = useAdminStore((state) => state.impersonatedTenantId);
  const [tenantId, setTenantId] = useState<string | null>(impersonatedId);

  useEffect(() => {
    const fetchTenant = async () => {
      if (impersonatedId) {
        setTenantId(impersonatedId);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users_dispara_lead_saas_02')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        if (data?.tenant_id) setTenantId(data.tenant_id);
      }
    };
    fetchTenant();
  }, [impersonatedId]);

  const [activeTab, setActiveTab] = useState("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [manualContacts, setManualContacts] = useState('');

  // Autocomplete State
  const [variableMenuOpen, setVariableMenuOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  // Save Audience State
  const [shouldSaveAudience, setShouldSaveAudience] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");

  // Select Audience State
  const [availableAudiences, setAvailableAudiences] = useState<Audience[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]); // Object IDs
  const [audienceSearchOpen, setAudienceSearchOpen] = useState(false);

  // Load audiences on mount
  useEffect(() => {
    audienceService.getAudiences().then(setAvailableAudiences).catch(console.error);
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { variables, contatos: uploadedContacts } = await uploadFile(file);
      onUpload(variables);

      // Auto-set campaign name from file if empty
      const fileName = file.name.split('.')[0];
      if (!campaignName) setCampaignName(fileName);
      if (!publicTarget) setPublicTarget(fileName);

      // Handle Save Audience Logic
      if (shouldSaveAudience && tenantId) {
        const finalName = saveName || fileName;
        await audienceService.createAudience({
          name: finalName,
          description: `Importado na campanha: ${campaignName || 'Untitled'}`,
          tags: saveTags,
          contacts: uploadedContacts.map(c => ({ phone_number: c.telefone, name: c.nome, metadata: c })),
          tenantId: tenantId
        });
        toast.success(`Público "${finalName}" salvo!`);
        // Refresh list
        audienceService.getAudiences().then(setAvailableAudiences);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }, [uploadFile, onUpload, shouldSaveAudience, saveName, saveTags, campaignName, tenantId, setCampaignName, setPublicTarget, publicTarget]);

  // Sync manual contacts to store
  useEffect(() => {
    if (activeTab === 'upload') {
      const contactsArray = manualContacts
        .split(/[\n,]+/)
        .map(c => c.trim())
        .filter(c => c)
        .map(c => ({ telefone: c }));

      if (contactsArray.length > 0 || (manualContacts === '' && contatos.length > 0)) {
        // Only update if manual input is active source
        // This is a bit tricky with file upload also setting contacts.
        // We assume manual clears file contacts locally in this simplified view if user types.
        if (contactsArray.length > 0) setContatos(contactsArray);
      }
    }
  }, [manualContacts, activeTab, setContatos]);

  const handleSaveAudience = async () => {
    if (!tenantId || contatos.length === 0) return;
    if (!saveName) {
      toast.error("Por favor, digite um nome para o público.");
      return;
    }

    // Include currentTag if typed but not added
    const finalTags = currentTag.trim() && !saveTags.includes(currentTag.trim())
      ? [...saveTags, currentTag.trim()]
      : saveTags;

    try {
      await audienceService.createAudience({
        name: saveName,
        description: `Importado na campanha: ${campaignName || 'Untitled'}`,
        tags: finalTags,
        // Map store contacts to AudienceContact format
        contacts: contatos.map(c => ({
          phone_number: c.telefone,
          name: c.nome || c.name || '',
          metadata: c
        })),
        tenantId: tenantId
      });

      toast.success(`Público "${saveName}" salvo com sucesso!`);
      setShouldSaveAudience(false);
      setSaveTags([]);
      setCurrentTag("");
      // Refresh available audiences
      audienceService.getAudiences().then(setAvailableAudiences);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar público. Verifique se o nome já existe.");
    }
  };

  // Handle Audience Selection
  const toggleAudience = async (audienceId: string) => {
    const newSelection = selectedAudiences.includes(audienceId)
      ? selectedAudiences.filter(id => id !== audienceId)
      : [...selectedAudiences, audienceId];

    setSelectedAudiences(newSelection);

    if (newSelection.length === 0) {
      setContatos([]);
      return;
    }

    // Fetch contacts for all selected audiences
    try {
      const audienceContacts = await audienceService.getContactsForAudiences(newSelection);
      const mappedContacts = audienceContacts.map(c => ({
        telefone: c.phone_number,
        nome: c.name || '',
        ...c.metadata
      }));
      setContatos(mappedContacts);

      // Update public target name
      const names = availableAudiences
        .filter(a => newSelection.includes(a.id))
        .map(a => a.name)
        .join(", ");
      setPublicTarget(names.substring(0, 50) + (names.length > 50 ? "..." : ""));

      // Notify parent about new variables
      // Extract keys from source metadata which is nested
      const metaKeys = audienceContacts.flatMap(c => Object.keys(c.metadata || {}));
      // Always include 'nome' as it's a standard variable
      const allKeys = Array.from(new Set([...metaKeys, 'nome']));

      onUpload(allKeys); // We use onUpload as a generic "onVariablesChange" here to avoid breaking interface

    } catch (error) {
      toast.error("Erro ao carregar contatos do público.");
    }
  };

  const addSaveTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      if (!saveTags.includes(currentTag.trim())) {
        setSaveTags([...saveTags, currentTag.trim()]);
      }
      setCurrentTag("");
    }
  };

  return (
    <Card className="rounded-b-lg rounded-t-none glass-card">
      <div className="p-6 space-y-6">

        {/* Common Fields */}
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload / Manual</TabsTrigger>
            <TabsTrigger value="select">Meus Públicos</TabsTrigger>
          </TabsList>

          {/* TAB 1: UPLOAD */}
          <TabsContent value="upload" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  />
                </div>
              </div>
            </div>

            {/* Save Audience Option */}
            <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={shouldSaveAudience} onCheckedChange={setShouldSaveAudience} id="save-audience" />
                <Label htmlFor="save-audience" className="cursor-pointer font-medium">Salvar lista como um novo Público</Label>
              </div>

              {shouldSaveAudience && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <Label>Nome do Público</Label>
                    <Input
                      placeholder="Ex: Leads Importados Hoje"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tags</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Tag + Enter"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={addSaveTag}
                      />
                      <div className="flex flex-wrap gap-1">
                        {saveTags.map(tag => {
                          const colors = getTagColor(tag);
                          return (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="px-2 py-0.5 text-xs border"
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                                borderColor: colors.border
                              }}
                            >
                              {tag} <button onClick={() => setSaveTags(saveTags.filter(t => t !== tag))} className="ml-1 hover:text-red-500">×</button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <Button
                      onClick={handleSaveAudience}
                      disabled={contatos.length === 0 || !saveName}
                      size="sm"
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Salvar Público
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: SELECT EXISTING */}
          <TabsContent value="select" className="space-y-4 pt-4">
            <div className="flex flex-col gap-2">
              <Label>Selecione um ou mais públicos</Label>
              <Popover open={audienceSearchOpen} onOpenChange={setAudienceSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={audienceSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedAudiences.length > 0
                      ? `${selectedAudiences.length} públicos selecionados`
                      : "Buscar público..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start" side="bottom">
                  <Command>
                    <CommandInput placeholder="Buscar por nome..." />
                    <CommandList>
                      <CommandEmpty>Nenhum público encontrado.</CommandEmpty>
                      <CommandGroup>
                        {availableAudiences.map((audience) => (
                          <CommandItem
                            key={audience.id}
                            value={audience.name}
                            onSelect={() => {
                              toggleAudience(audience.id);
                              // Don't close to allow multi-select
                            }}
                          >
                            <CheckCircle
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedAudiences.includes(audience.id) ? "opacity-100 text-green-500" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{audience.name}</span>
                              <span className="text-xs text-muted-foreground">{audience.total_contacts} contatos</span>
                            </div>
                            <div className="ml-auto flex gap-1">
                              {audience.tags?.slice(0, 2).map((tag: any) => {
                                const colors = getTagColor(tag.name);
                                return (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="text-[10px] px-1 h-5 border"
                                    style={{
                                      backgroundColor: colors.bg,
                                      color: colors.text,
                                      borderColor: colors.border
                                    }}
                                  >
                                    {tag.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedAudiences.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableAudiences
                    .filter(a => selectedAudiences.includes(a.id))
                    .map(a => (
                      <Badge key={a.id} className="pl-2 pr-1 py-1 gap-1">
                        {a.name}
                        <button onClick={() => toggleAudience(a.id)} className="hover:bg-primary-foreground/20 rounded-full p-0.5"><Users className="h-3 w-3" /></button>
                      </Badge>
                    ))
                  }
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs >

        {/* Global Footer Stats */}
        {
          contatos.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 rounded-md border border-green-200">
              <CheckCircle className="h-5 w-5" />
              <p><span className="font-bold">{contatos.length}</span> contatos carregados e prontos para o envio.</p>
            </div>
          )
        }
      </div >
    </Card >
  );
};