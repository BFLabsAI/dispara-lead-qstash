import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getContactSyncJobState,
  getInstanceContacts,
  getLatestSyncRun,
  getLatestSyncRunsByInstance,
  getStoredSelectedContactsInstance,
  getTenantInstances,
  setStoredSelectedContactsInstance,
  startInstanceContactsSync,
  subscribeToContactSyncJobs,
  type ContactSyncJobState,
  type InstanceContact,
  type InstanceListItem,
  type InstanceSyncRun,
} from "@/services/instanceContactsService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Server, Tags, Users } from "lucide-react";
import { toast } from "sonner";

const CONTACTS_PAGE_SIZE = 50;

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim();
  if (![3, 6].includes(normalized.length)) return undefined;

  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const int = Number.parseInt(safeHex, 16);
  if (Number.isNaN(int)) return undefined;

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getLabelBadgeStyle(colorHex: string | null) {
  if (!colorHex) return undefined;

  return {
    backgroundColor: hexToRgba(colorHex, 0.22) ?? undefined,
    borderColor: hexToRgba(colorHex, 0.5) ?? undefined,
    color: colorHex,
  };
}

function getInstanceStatusBadge(status: string | null) {
  const normalized = (status ?? "desconhecido").toLowerCase();

  if (["open", "connected"].includes(normalized)) {
    return <Badge className="bg-green-600 hover:bg-green-600">Conectada</Badge>;
  }

  if (["connecting", "pending"].includes(normalized)) {
    return <Badge className="bg-amber-500 hover:bg-amber-500">Conectando</Badge>;
  }

  return <Badge variant="secondary">{status || "Desconectada"}</Badge>;
}

function getSyncStatusBadge(run: InstanceSyncRun | null, jobState: ContactSyncJobState | null) {
  if (jobState?.status === "running") {
    return (
      <Badge className="gap-1.5 bg-blue-600 hover:bg-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        Sincronizando
      </Badge>
    );
  }

  if (jobState?.status === "failed" || run?.status === "failed") {
    return <Badge variant="destructive">Falhou</Badge>;
  }

  if (run?.status === "completed") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Sincronizada</Badge>;
  }

  if (run?.status === "running") {
    return <Badge className="bg-blue-600 hover:bg-blue-600">Em andamento</Badge>;
  }

  return <Badge variant="outline">Nunca sincronizada</Badge>;
}

function resolveDisplayName(contact: InstanceContact) {
  return (
    contact.display_name ||
    contact.contact_name ||
    contact.wa_contact_name ||
    contact.details_name ||
    contact.wa_name ||
    contact.phone
  );
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    getStoredSelectedContactsInstance(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLabelFilter, setSelectedLabelFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [jobStates, setJobStates] = useState<Record<string, ContactSyncJobState>>({});

  useEffect(() => {
    return subscribeToContactSyncJobs(setJobStates);
  }, []);

  const instancesQuery = useQuery({
    queryKey: ["contacts", "instances"],
    queryFn: getTenantInstances,
  });

  useEffect(() => {
    const instances = instancesQuery.data ?? [];
    if (instances.length === 0) return;

    const stillExists = selectedInstanceId
      ? instances.some((instance) => instance.id === selectedInstanceId)
      : false;

    if (stillExists) return;

    setSelectedInstanceId(instances[0].id);
    setStoredSelectedContactsInstance(instances[0].id);
  }, [instancesQuery.data, selectedInstanceId]);

  const latestRunsQuery = useQuery({
    queryKey: ["contacts", "latest-sync-runs", (instancesQuery.data ?? []).map((item) => item.id)],
    queryFn: () => getLatestSyncRunsByInstance((instancesQuery.data ?? []).map((item) => item.id)),
    enabled: Boolean(instancesQuery.data && instancesQuery.data.length > 0),
    refetchInterval: () =>
      Object.values(jobStates).some((state) => state.status === "running") ? 4000 : false,
  });

  const selectedJobState = selectedInstanceId ? (jobStates[selectedInstanceId] ?? getContactSyncJobState(selectedInstanceId)) : null;

  const contactsQuery = useQuery({
    queryKey: ["contacts", "instance", selectedInstanceId],
    queryFn: () => getInstanceContacts(selectedInstanceId as string),
    enabled: Boolean(selectedInstanceId),
    refetchInterval: () => (selectedJobState?.status === "running" ? 5000 : false),
  });

  const selectedRunQuery = useQuery({
    queryKey: ["contacts", "instance", selectedInstanceId, "latest-run"],
    queryFn: () => getLatestSyncRun(selectedInstanceId as string),
    enabled: Boolean(selectedInstanceId),
    refetchInterval: () => (selectedJobState?.status === "running" ? 4000 : false),
  });

  const selectedInstance = useMemo(
    () => (instancesQuery.data ?? []).find((instance) => instance.id === selectedInstanceId) ?? null,
    [instancesQuery.data, selectedInstanceId],
  );

  const availableLabels = useMemo(() => {
    const labelsMap = new Map<string, string>();

    for (const contact of contactsQuery.data ?? []) {
      for (const label of contact.labels) {
        labelsMap.set(label.external_label_id, label.name || label.external_label_id);
      }
    }

    return Array.from(labelsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contactsQuery.data]);

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const contacts = contactsQuery.data ?? [];

    return contacts.filter((contact) => {
      const matchesLabel =
        selectedLabelFilter === "all"
          ? true
          : contact.labels.some((label) => label.external_label_id === selectedLabelFilter);

      if (!matchesLabel) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const labelNames = contact.labels.map((label) => label.name ?? label.external_label_id).join(" ").toLowerCase();
      const searchable = [
        resolveDisplayName(contact),
        contact.phone,
        contact.contact_name,
        contact.contact_first_name,
        contact.details_name,
        contact.wa_name,
        contact.wa_contact_name,
        labelNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [contactsQuery.data, searchTerm, selectedLabelFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInstanceId, searchTerm, selectedLabelFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / CONTACTS_PAGE_SIZE));
  const paginatedContacts = useMemo(() => {
    const from = (currentPage - 1) * CONTACTS_PAGE_SIZE;
    const to = from + CONTACTS_PAGE_SIZE;
    return filteredContacts.slice(from, to);
  }, [currentPage, filteredContacts]);

  const handleSelectInstance = (instance: InstanceListItem) => {
    setSelectedInstanceId(instance.id);
    setStoredSelectedContactsInstance(instance.id);
    setSearchTerm("");
    setSelectedLabelFilter("all");
  };

  const handleSync = async () => {
    if (!selectedInstanceId) return;

    try {
      toast.info(`Sincronização iniciada para ${selectedInstance?.instance_name ?? "a instância"}.`);
      await startInstanceContactsSync(selectedInstanceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contacts", "instance", selectedInstanceId] }),
        queryClient.invalidateQueries({ queryKey: ["contacts", "instance", selectedInstanceId, "latest-run"] }),
        queryClient.invalidateQueries({ queryKey: ["contacts", "latest-sync-runs"] }),
      ]);
      toast.success("Sincronização concluída.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao sincronizar contatos.");
    }
  };

  const summaryRun = selectedRunQuery.data;
  const totalLabelsForSelectedInstance = new Set(
    (contactsQuery.data ?? []).flatMap((contact) => contact.labels.map((label) => label.external_label_id)),
  ).size;

  if (instancesQuery.isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contatos"
        subtitle="Selecione uma instância, acompanhe a sincronização e explore os contatos persistidos no tenant atual."
        extra={
          <Button
            onClick={handleSync}
            disabled={!selectedInstanceId || selectedJobState?.status === "running"}
            className="gap-2 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
          >
            {selectedJobState?.status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sincronizar
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[28px] border-emerald-300/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(220,252,231,0.94))] shadow-sm dark:border-emerald-950/80 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(2,24,21,0.94))]">
          <CardHeader className="border-b border-emerald-200/80 bg-[radial-gradient(circle_at_top_left,rgba(5,150,105,0.18),transparent_42%),linear-gradient(180deg,rgba(209,250,229,0.98),rgba(236,253,245,0.92))] dark:border-emerald-900/70 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_42%),linear-gradient(180deg,rgba(6,78,59,0.38),rgba(4,47,36,0.16))]">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5 text-primary" />
              Instâncias
            </CardTitle>
            <CardDescription>Escolha a instância que será a base da sincronização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {(instancesQuery.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Nenhuma instância encontrada para o tenant ativo.
              </div>
            ) : (
              (instancesQuery.data ?? []).map((instance) => {
                const latestRun = latestRunsQuery.data?.[instance.id] ?? null;
                const jobState = jobStates[instance.id] ?? getContactSyncJobState(instance.id);
                const isSelected = instance.id === selectedInstanceId;

                return (
                  <button
                    key={instance.id}
                    type="button"
                    onClick={() => handleSelectInstance(instance)}
                    className={cn(
                      "w-full rounded-[22px] border p-4 text-left shadow-sm transition-all",
                      isSelected
                        ? "border-emerald-500/70 bg-[linear-gradient(135deg,rgba(209,250,229,1),rgba(167,243,208,0.88))] shadow-emerald-500/10 dark:border-emerald-700 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.62),rgba(4,47,36,0.58))]"
                        : "border-border/60 bg-background/70 hover:border-emerald-400/70 hover:bg-emerald-100/70 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{instance.instance_name}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {getInstanceStatusBadge(instance.status)}
                          {getSyncStatusBadge(latestRun, jobState)}
                        </div>
                      </div>
                    </div>
                    {latestRun?.updated_at && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Última atualização: {new Date(latestRun.updated_at).toLocaleString()}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[24px] border-emerald-300/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(220,252,231,0.94))] shadow-sm dark:border-emerald-950/80 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(2,24,21,0.92))]">
              <CardHeader className="pb-2">
                <CardDescription>Instância ativa</CardDescription>
                <CardTitle className="text-xl">
                  {selectedInstance?.instance_name ?? "Selecione uma instância"}
                </CardTitle>
              </CardHeader>
              <CardContent>{selectedInstance ? getInstanceStatusBadge(selectedInstance.status) : null}</CardContent>
            </Card>

            <Card className="rounded-[24px] border-emerald-300/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(220,252,231,0.94))] shadow-sm dark:border-emerald-950/80 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(2,24,21,0.92))]">
              <CardHeader className="pb-2">
                <CardDescription>Total de contatos</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <Users className="h-6 w-6 text-primary" />
                  {(contactsQuery.data ?? []).length}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Contatos únicos persistidos para a instância selecionada.
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-emerald-300/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(220,252,231,0.94))] shadow-sm dark:border-emerald-950/80 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(2,24,21,0.92))]">
              <CardHeader className="pb-2">
                <CardDescription>Total de etiquetas</CardDescription>
                <CardTitle className="text-3xl">{totalLabelsForSelectedInstance}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Etiquetas resolvidas localmente para exibição e filtro.
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-emerald-300/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(220,252,231,0.94))] shadow-sm dark:border-emerald-950/80 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(2,24,21,0.92))]">
              <CardHeader className="pb-2">
                <CardDescription>Total de vínculos</CardDescription>
                <CardTitle className="text-3xl">{summaryRun?.contact_labels_linked ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Relações contato-etiqueta registradas no último estado sincronizado.
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-[28px] border-emerald-300/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(220,252,231,0.95))] shadow-sm dark:border-emerald-950/80 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(2,24,21,0.94))]">
            <CardHeader className="gap-3 border-b border-emerald-200/80 bg-[radial-gradient(circle_at_top_left,rgba(5,150,105,0.18),transparent_42%),linear-gradient(180deg,rgba(209,250,229,0.98),rgba(236,253,245,0.92))] dark:border-emerald-900/70 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_42%),linear-gradient(180deg,rgba(6,78,59,0.38),rgba(4,47,36,0.16))]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Base de contatos sincronizados</CardTitle>
                  <CardDescription>
                    Busca local por nome, número ou label. A UI lê apenas o que já foi persistido no Supabase.
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por nome, telefone ou label..."
                      className="rounded-2xl border-emerald-300/80 bg-emerald-50/70 pl-9 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30"
                      disabled={!selectedInstanceId}
                    />
                  </div>
                  <Select
                    value={selectedLabelFilter}
                    onValueChange={setSelectedLabelFilter}
                    disabled={!selectedInstanceId}
                  >
                    <SelectTrigger className="w-full rounded-2xl border-emerald-300/80 bg-emerald-50/70 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30 lg:w-[260px]">
                      <SelectValue placeholder="Filtrar por label" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as labels</SelectItem>
                      {availableLabels.map((label) => (
                        <SelectItem key={label.id} value={label.id}>
                          {label.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedJobState?.status === "running" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                  <div className="flex items-center gap-2 font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Atualizando contatos em background
                  </div>
                  <div className="mt-1 text-xs">
                    Página atual: {selectedJobState.currentPage || 1}
                    {selectedJobState.lastResult?.pagination?.totalPages
                      ? ` de ${selectedJobState.lastResult.pagination.totalPages}`
                      : ""}
                    . Você pode sair da página e voltar depois; a sincronização continua no app enquanto a sessão estiver aberta.
                  </div>
                </div>
              )}

              {selectedJobState?.status === "failed" && selectedJobState.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  Falha na sincronização: {selectedJobState.error}
                </div>
              )}

              {summaryRun && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-100/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                    {summaryRun.contacts_listed} processados
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-100/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                    {summaryRun.contacts_inserted} inseridos
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-100/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                    {summaryRun.contacts_updated} atualizados
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-100/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                    {summaryRun.contact_labels_linked} vínculos contato-label
                  </Badge>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {!selectedInstanceId ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                  Selecione uma instância para visualizar os contatos sincronizados.
                </div>
              ) : contactsQuery.isLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                  {contactsQuery.data && contactsQuery.data.length > 0
                    ? "Nenhum contato corresponde ao filtro atual."
                    : "Essa instância ainda não tem contatos sincronizados."}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(236,253,245,0.88))] shadow-sm dark:border-emerald-950/70 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.94),rgba(2,24,21,0.96))]">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-emerald-100/90 backdrop-blur dark:bg-[linear-gradient(180deg,rgba(6,78,59,0.92),rgba(4,47,36,0.92))]">
                      <TableRow>
                        <TableHead className="font-semibold text-foreground">Contato</TableHead>
                        <TableHead className="font-semibold text-foreground">Número</TableHead>
                        <TableHead className="font-semibold text-foreground">Origem</TableHead>
                        <TableHead className="font-semibold text-foreground">Labels</TableHead>
                        <TableHead className="font-semibold text-foreground">Lead Tags</TableHead>
                        <TableHead className="font-semibold text-foreground">Último sync</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedContacts.map((contact) => (
                        <TableRow key={contact.id} className="border-emerald-200/70 transition-colors hover:bg-emerald-100/60 dark:border-emerald-950/60 dark:hover:bg-emerald-950/25">
                          <TableCell className="min-w-[240px]">
                            <div className="font-medium text-foreground">{resolveDisplayName(contact)}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              agenda: {contact.contact_name || "-"} | whatsapp: {contact.wa_name || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                              <span className="rounded-full border border-emerald-300/80 bg-emerald-100 px-2.5 py-1 text-[11px] font-medium tracking-wide text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                              {contact.phone || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>jid: {contact.jid}</div>
                            <div>chat: {contact.wa_chatid || "-"}</div>
                          </TableCell>
                          <TableCell className="min-w-[220px]">
                            <div className="flex flex-wrap gap-1.5">
                              {contact.labels.length > 0 ? (
                                contact.labels.map((label) => (
                                  <Badge
                                    key={`${contact.id}-${label.external_label_id}`}
                                    variant="secondary"
                                    className="gap-1 rounded-full border"
                                    style={getLabelBadgeStyle(label.color_hex)}
                                  >
                                    <Tags className="h-3 w-3" />
                                    {label.name || label.external_label_id}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Sem labels</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <div className="flex flex-wrap gap-1.5">
                              {contact.lead_tags.length > 0 ? (
                                contact.lead_tags.map((tag) => (
                                  <Badge key={`${contact.id}-${tag}`} variant="outline" className="rounded-full border-emerald-300 bg-emerald-100/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Sem tags</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(contact.last_synced_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredContacts.length > CONTACTS_PAGE_SIZE && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 dark:border-emerald-950/70 dark:bg-emerald-950/30 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando{" "}
                    <span className="font-medium text-foreground">
                      {(currentPage - 1) * CONTACTS_PAGE_SIZE + 1}
                    </span>
                    {" "}a{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(currentPage * CONTACTS_PAGE_SIZE, filteredContacts.length)}
                    </span>
                    {" "}de{" "}
                    <span className="font-medium text-foreground">{filteredContacts.length}</span>
                    {" "}contatos
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-100/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                      Página {currentPage} de {totalPages}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-emerald-300 bg-white/90 dark:border-emerald-800 dark:bg-emerald-950/40"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-emerald-300 bg-white/90 dark:border-emerald-800 dark:bg-emerald-950/40"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                    >
                      Próxima
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
