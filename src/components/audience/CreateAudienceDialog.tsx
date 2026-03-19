import { useEffect, useMemo, useState } from "react";
import { AudienceSplitUpload } from "@/components/audience/AudienceSplitUpload";
import {
  audienceService,
  type AudienceCreationInstance,
  type SyncedInstanceLabel,
} from "@/services/audienceService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Tags, UploadCloud, Users, ArrowLeft, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";

type CreationSource = "chooser" | "import" | "contacts";
type ContactsMode = "labels" | "naming";

interface CreateAudienceDialogProps {
  onSuccess?: () => void | Promise<void>;
}

const normalizeNamingTerm = (value: string) => value.trim().toLowerCase();

export function CreateAudienceDialog({ onSuccess }: CreateAudienceDialogProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<CreationSource>("chooser");
  const [instances, setInstances] = useState<AudienceCreationInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [contactsMode, setContactsMode] = useState<ContactsMode>("labels");
  const [labels, setLabels] = useState<SyncedInstanceLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [namingTerm, setNamingTerm] = useState("");
  const [audienceName, setAudienceName] = useState("");
  const [audienceTagsInput, setAudienceTagsInput] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId],
  );

  useEffect(() => {
    if (!open || source !== "contacts") return;

    let cancelled = false;
    const loadInstances = async () => {
      setInstancesLoading(true);
      try {
        const data = await audienceService.getAudienceCreationInstances();
        if (!cancelled) {
          setInstances(data);
          if (!selectedInstanceId && data[0]) {
            setSelectedInstanceId(data[0].id);
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("Erro ao carregar instâncias para criação de audiência.");
      } finally {
        if (!cancelled) setInstancesLoading(false);
      }
    };

    void loadInstances();
    return () => {
      cancelled = true;
    };
  }, [open, source]);

  useEffect(() => {
    if (!open || source !== "contacts" || contactsMode !== "labels" || !selectedInstanceId) {
      setLabels([]);
      return;
    }

    let cancelled = false;
    const loadLabels = async () => {
      setLabelsLoading(true);
      try {
        const data = await audienceService.getSyncedLabelsForInstance(selectedInstanceId);
        if (!cancelled) {
          setLabels(data);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("Erro ao carregar etiquetas da instância.");
      } finally {
        if (!cancelled) setLabelsLoading(false);
      }
    };

    void loadLabels();
    return () => {
      cancelled = true;
    };
  }, [open, source, contactsMode, selectedInstanceId]);

  useEffect(() => {
    if (!open || source !== "contacts" || !selectedInstanceId) {
      setMatchCount(null);
      return;
    }

    let cancelled = false;

    const computeCount = async () => {
      if (contactsMode === "labels") {
        if (selectedLabelIds.length === 0) {
          setMatchCount(0);
          return;
        }
      } else if (!normalizeNamingTerm(namingTerm)) {
        setMatchCount(0);
        return;
      }

      setCountLoading(true);
      try {
        const count = contactsMode === "labels"
          ? await audienceService.countSyncedContactsByLabels(selectedInstanceId, selectedLabelIds)
          : await audienceService.countSyncedContactsByNaming(selectedInstanceId, namingTerm);

        if (!cancelled) {
          setMatchCount(count);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setMatchCount(null);
          toast.error("Erro ao calcular a quantidade de contatos.");
        }
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    };

    void computeCount();
    return () => {
      cancelled = true;
    };
  }, [open, source, selectedInstanceId, contactsMode, selectedLabelIds, namingTerm]);

  const resetState = () => {
    setSource("chooser");
    setInstances([]);
    setSelectedInstanceId("");
    setContactsMode("labels");
    setLabels([]);
    setSelectedLabelIds([]);
    setNamingTerm("");
    setAudienceName("");
    setAudienceTagsInput("");
    setAudienceDescription("");
    setMatchCount(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetState();
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((current) => (
      current.includes(labelId)
        ? current.filter((item) => item !== labelId)
        : [...current, labelId]
    ));
  };

  const parsedTags = useMemo(
    () => audienceTagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
    [audienceTagsInput],
  );

  const canCreateFromContacts = Boolean(
    selectedInstanceId &&
    audienceName.trim() &&
    (contactsMode === "labels" ? selectedLabelIds.length > 0 : normalizeNamingTerm(namingTerm)) &&
    (matchCount ?? 0) > 0,
  );

  const handleCreateFromContacts = async () => {
    if (!canCreateFromContacts) return;

    setCreating(true);
    try {
      await audienceService.createAudienceFromSyncedContacts({
        name: audienceName.trim(),
        description: audienceDescription.trim() || undefined,
        tags: parsedTags,
        instanceId: selectedInstanceId,
        mode: contactsMode,
        labelIds: contactsMode === "labels" ? selectedLabelIds : undefined,
        namingTerm: contactsMode === "naming" ? namingTerm : undefined,
      });

      toast.success("Audiência criada com sucesso.");
      await onSuccess?.();
      handleOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar audiência.");
    } finally {
      setCreating(false);
    }
  };

  const currentModeLabel = contactsMode === "labels" ? "Etiquetas" : "Naming";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nova Audiência
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        {source === "import" ? (
          <div className="flex max-h-[90vh] flex-col">
            <div className="border-b bg-gradient-to-r from-primary/10 via-background to-background px-6 py-5">
              <DialogHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <UploadCloud className="h-3.5 w-3.5" />
                    Importar
                  </Badge>
                  <Badge variant="outline">Planilha</Badge>
                </div>
                <DialogTitle>Importar Contatos</DialogTitle>
                <DialogDescription>
                  Faça upload de uma planilha para criar novas audiências. Você pode dividir listas grandes automaticamente.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AudienceSplitUpload onSuccess={async () => {
                await onSuccess?.();
                handleOpenChange(false);
              }} />
            </div>
          </div>
        ) : source === "contacts" ? (
          <div className="flex max-h-[90vh] flex-col">
            <div className="border-b bg-gradient-to-r from-primary/10 via-background to-background px-6 py-5">
              <DialogHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Criar de contatos
                  </Badge>
                  <Badge variant="outline">{currentModeLabel}</Badge>
                  {selectedInstance?.instance_name && (
                    <Badge variant="outline">{selectedInstance.instance_name}</Badge>
                  )}
                </div>
                <DialogTitle>Criar audiência de contatos sincronizados</DialogTitle>
                <DialogDescription>
                  Selecione uma instância de referência e crie a audiência com base em etiquetas ou naming usando a base local já sincronizada.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <section className="space-y-4 rounded-xl border bg-card/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid flex-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Instância de referência</Label>
                      <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={instancesLoading ? "Carregando..." : "Selecione uma instância"} />
                        </SelectTrigger>
                        <SelectContent>
                          {instances.map((instance) => (
                            <SelectItem key={instance.id} value={instance.id}>
                              {instance.instance_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Modo de criação</Label>
                      <Select value={contactsMode} onValueChange={(value) => {
                        setContactsMode(value as ContactsMode);
                        setSelectedLabelIds([]);
                        setNamingTerm("");
                        setMatchCount(null);
                      }}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labels">Com base em etiquetas</SelectItem>
                          <SelectItem value="naming">Com base em naming</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex min-w-[220px] items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contatos encontrados</p>
                      <p className="text-2xl font-semibold">{matchCount ?? 0}</p>
                    </div>
                    {countLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              </section>

              {contactsMode === "labels" ? (
                <section className="space-y-4 rounded-xl border bg-card/60 p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Selecionar etiquetas</h3>
                    <p className="text-xs text-muted-foreground">Escolha uma ou mais etiquetas da instância selecionada para compor a audiência.</p>
                  </div>

                  {labelsLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando etiquetas...
                    </div>
                  ) : labels.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      Nenhuma etiqueta sincronizada para esta instância.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {labels.map((label) => {
                        const selected = selectedLabelIds.includes(label.id);
                        return (
                          <label
                            key={label.id}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-colors",
                              selected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "hover:border-primary/40 hover:bg-muted/30",
                            )}
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => toggleLabel(label.id)}
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{label.name || label.external_label_id}</div>
                              <div className="mt-1 text-xs text-muted-foreground truncate">{label.external_label_id}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <section className="space-y-4 rounded-xl border bg-card/60 p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Buscar por naming</h3>
                    <p className="text-xs text-muted-foreground">
                      A busca usa texto normalizado em minúsculas e considera contatos cujo naming contenha o trecho digitado.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="space-y-2">
                      <Label htmlFor="audience-naming-term">Texto de busca</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="audience-naming-term"
                          className="rounded-xl pl-9"
                          placeholder="Ex: Traf Mar"
                          value={namingTerm}
                          onChange={(event) => setNamingTerm(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Normalizado</Label>
                      <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm font-mono">
                        {normalizeNamingTerm(namingTerm) || "-"}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-4 rounded-xl border bg-card/60 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Configuração da audiência</h3>
                  <p className="text-xs text-muted-foreground">Defina o nome final da audiência, descrição opcional e tags internas.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="audience-name">Nome da audiência</Label>
                    <Input
                      id="audience-name"
                      className="rounded-xl"
                      value={audienceName}
                      onChange={(event) => setAudienceName(event.target.value)}
                      placeholder="Ex: Leads etiqueta remarketing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audience-tags">Tags da audiência</Label>
                    <Input
                      id="audience-tags"
                      className="rounded-xl"
                      value={audienceTagsInput}
                      onChange={(event) => setAudienceTagsInput(event.target.value)}
                      placeholder="tag-1, tag-2"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="audience-description">Descrição</Label>
                    <Input
                      id="audience-description"
                      className="rounded-xl"
                      value={audienceDescription}
                      onChange={(event) => setAudienceDescription(event.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedInstance?.instance_name || "Sem instância"}</Badge>
                  <Badge variant="outline">{currentModeLabel}</Badge>
                  {contactsMode === "labels" && selectedLabelIds.length > 0 && (
                    <Badge variant="outline">{selectedLabelIds.length} etiqueta(s)</Badge>
                  )}
                  {contactsMode === "naming" && normalizeNamingTerm(namingTerm) && (
                    <Badge variant="outline">trecho: {normalizeNamingTerm(namingTerm)}</Badge>
                  )}
                </div>
              </section>
            </div>

            <div className="border-t bg-background/90 px-6 py-4">
              <div className="flex justify-between gap-3">
                <Button variant="ghost" onClick={() => setSource("chooser")} disabled={creating} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleCreateFromContacts} disabled={!canCreateFromContacts || creating} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  Criar audiência
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex max-h-[90vh] flex-col">
            <div className="border-b bg-gradient-to-r from-primary/10 via-background to-background px-6 py-5">
              <DialogHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Nova audiência
                  </Badge>
                </div>
                <DialogTitle>Escolha a origem da audiência</DialogTitle>
                <DialogDescription>
                  Importe uma planilha ou monte a audiência a partir dos contatos já sincronizados no workspace.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setSource("import")}
                className="rounded-3xl border bg-card/70 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">Importar</div>
                  <Badge variant="outline">Planilha</Badge>
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  Mantém o fluxo atual de upload, mapeamento de colunas e divisão em múltiplas audiências.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSource("contacts")}
                className="rounded-3xl border bg-card/70 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Tags className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">Criar de contatos</div>
                  <Badge variant="outline">Sincronizados</Badge>
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  Usa a base local sincronizada da instância para criar audiências por etiquetas ou por naming.
                </div>
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
