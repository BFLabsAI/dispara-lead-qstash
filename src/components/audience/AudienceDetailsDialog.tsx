import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { audienceService, AudienceContact, Tag } from "@/services/audienceService";
import { AddAudienceContactsDialog } from "@/components/audience/AddAudienceContactsDialog";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, Plus, Search, Tag as TagIcon, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn, getTagColor } from "@/lib/utils";

interface AudienceDetailsDialogProps {
    audienceId: string;
    audienceName: string;
    audienceTags?: Tag[];
    onAudienceChanged?: () => void | Promise<void>;
}

const PAGE_SIZE = 25;

const formatMetadataPreview = (metadata?: Record<string, unknown>) => {
    const entries = Object.entries(metadata || {}).filter(([, value]) => {
        if (value === null || value === undefined) return false;
        return String(value).trim().length > 0;
    });

    if (entries.length === 0) return "Sem metadados";

    const preview = entries.slice(0, 2).map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}: ${value.slice(0, 2).map((item) => String(item)).join(", ")}`;
        }

        if (value && typeof value === "object") {
            return `${key}: [objeto]`;
        }

        return `${key}: ${String(value)}`;
    });

    const extra = entries.length > 2 ? ` +${entries.length - 2}` : "";
    return `${preview.join(" • ")}${extra}`;
};

export const AudienceDetailsDialog = ({
    audienceId,
    audienceName,
    audienceTags = [],
    onAudienceChanged,
}: AudienceDetailsDialogProps) => {
    const [contacts, setContacts] = useState<AudienceContact[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [reloadToken, setReloadToken] = useState(0);
    const [contactToRemove, setContactToRemove] = useState<AudienceContact | null>(null);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<Tag[]>(audienceTags);
    const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState("");
    const [savingTags, setSavingTags] = useState(false);

    const requestIdRef = useRef(0);

    useEffect(() => {
        setSelectedTags(audienceTags);
    }, [audienceTags]);

    useEffect(() => {
        if (!isOpen) {
            setContacts([]);
            setError(null);
            setLoading(false);
            setPage(1);
            setTotalCount(0);
            setSearchInput("");
            setDebouncedSearch("");
            setReloadToken(0);
            setTagSearch("");
            setTagPopoverOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const loadTags = async () => {
            try {
                const tags = await audienceService.getTags();
                setAvailableTags(tags);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar tags da audiência.");
            }
        };

        void loadTags();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const timer = window.setTimeout(() => {
            setPage(1);
            setDebouncedSearch(searchInput.trim());
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchInput, isOpen]);

    useEffect(() => {
        if (!isOpen || !audienceId) return;

        let cancelled = false;
        const requestId = ++requestIdRef.current;

        const loadContacts = async () => {
            setLoading(true);
            setError(null);

            try {
                const result = await audienceService.getAudienceContactsPage({
                    audienceId,
                    page,
                    pageSize: PAGE_SIZE,
                    searchTerm: debouncedSearch || undefined,
                });

                if (cancelled || requestId !== requestIdRef.current) return;

                if (result.totalPages > 0 && page > result.totalPages) {
                    setPage(result.totalPages);
                    return;
                }

                setContacts(result.data);
                setTotalCount(result.count);
            } catch (err) {
                if (cancelled || requestId !== requestIdRef.current) return;
                console.error(err);
                setError("Erro ao carregar contatos da audiência.");
            } finally {
                if (!cancelled && requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        };

        void loadContacts();

        return () => {
            cancelled = true;
        };
    }, [audienceId, debouncedSearch, isOpen, page, reloadToken]);

    const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;
    const normalizedTagSearch = tagSearch.trim().toLowerCase();
    const selectedTagIds = new Set(selectedTags.map((tag) => tag.id));
    const filteredTags = availableTags.filter((tag) => {
        if (!normalizedTagSearch) return true;
        return tag.name.toLowerCase().includes(normalizedTagSearch);
    });
    const exactMatchingTag = availableTags.find(
        (tag) => tag.name.trim().toLowerCase() === normalizedTagSearch
    );
    const canCreateTag = normalizedTagSearch.length > 0 && !exactMatchingTag;

    const handleMutationDone = async () => {
        setReloadToken((value) => value + 1);
        await onAudienceChanged?.();
    };

    const handleRemove = async (contact: AudienceContact) => {
        if (!contact.id) {
            toast.error("Contato sem identificador.");
            return;
        }

        try {
            const removed = await audienceService.removeAudienceContact(contact.id);
            if (!removed) {
                toast.error("Não foi possível remover o contato.");
                return;
            }

            toast.success("Contato removido.");
            await handleMutationDone();
            setContactToRemove(null);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao remover contato.");
        }
    };

    const handleAddTag = async (tagName: string) => {
        const normalizedName = tagName.trim();
        if (!normalizedName) return;

        setSavingTags(true);

        try {
            const result = await audienceService.addAudienceTags({
                audienceId,
                tagNames: [normalizedName],
            });

            if (result.added.length === 0) {
                toast.info("Essa tag já está vinculada à audiência.");
                return;
            }

            setSelectedTags((current) => {
                const currentIds = new Set(current.map((tag) => tag.id));
                const next = [...current];
                for (const tag of result.added) {
                    if (!currentIds.has(tag.id)) next.push(tag);
                }
                return next;
            });

            setAvailableTags((current) => {
                const currentIds = new Set(current.map((tag) => tag.id));
                const next = [...current];
                for (const tag of result.added) {
                    if (!currentIds.has(tag.id)) next.push(tag);
                }
                return next.sort((a, b) => a.name.localeCompare(b.name));
            });

            setTagSearch("");
            setTagPopoverOpen(false);
            toast.success(`Tag "${normalizedName}" adicionada à audiência.`);
            await onAudienceChanged?.();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao adicionar tag à audiência.");
        } finally {
            setSavingTags(false);
        }
    };

    const handleRemoveTag = async (tag: Tag) => {
        try {
            const removed = await audienceService.removeAudienceTag({
                audienceId,
                tagId: tag.id,
            });

            if (!removed) {
                toast.error("Não foi possível remover a tag.");
                return;
            }

            setSelectedTags((current) => current.filter((item) => item.id !== tag.id));
            toast.success(`Tag "${tag.name}" removida.`);
            await onAudienceChanged?.();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao remover tag da audiência.");
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full border border-transparent bg-background/60 p-0 transition-all hover:border-primary/20 hover:bg-primary/5">
                        <Search className="h-4 w-4" />
                        <span className="sr-only">Ver detalhes</span>
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-6xl h-[92vh] overflow-hidden border-0 bg-transparent p-0 shadow-none">
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-emerald-300/70 bg-[linear-gradient(180deg,rgba(220,252,231,0.96)_0%,rgba(240,253,244,0.98)_18%,rgba(236,253,245,0.98)_100%)] text-foreground shadow-2xl shadow-emerald-500/15 dark:border-emerald-900/70 dark:bg-[linear-gradient(180deg,rgba(2,44,34,0.98)_0%,rgba(3,57,46,0.98)_18%,rgba(2,24,21,0.99)_100%)] dark:text-foreground dark:shadow-emerald-950/40">
                    <div className="border-b border-emerald-300/60 bg-[radial-gradient(circle_at_top_left,rgba(22,163,74,0.28),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_26%),linear-gradient(135deg,rgba(240,253,244,0.98),rgba(209,250,229,0.92))] px-6 py-5 dark:border-emerald-900/60 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_26%),linear-gradient(135deg,rgba(4,47,36,0.96),rgba(6,78,59,0.88))]">
                        <DialogHeader className="space-y-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="gap-1 rounded-full border-emerald-500/30 bg-emerald-50/90 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-800 backdrop-blur dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                                            <Users className="h-3.5 w-3.5" />
                                            Gestão de contatos
                                        </Badge>
                                        <Badge variant="secondary" className="rounded-full border border-emerald-500/20 bg-emerald-600/15 px-3 py-1 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100">
                                            {totalCount > 0 ? `${totalCount} contato(s)` : "Sem contatos"}
                                        </Badge>
                                    </div>
                                    <DialogTitle className="text-2xl font-semibold tracking-tight md:text-3xl">{audienceName}</DialogTitle>
                                    <DialogDescription className="max-w-2xl text-sm leading-6 text-muted-foreground/90">
                                        Busque, adicione ou remova contatos desta audiência. A listagem é paginada para evitar carregar tudo de uma vez.
                                    </DialogDescription>
                                </div>

                                <div className="flex items-center gap-2">
                                    <AddAudienceContactsDialog
                                        audienceId={audienceId}
                                        audienceName={audienceName}
                                        onContactsAdded={handleMutationDone}
                                    />
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-emerald-300/70 bg-white/65 p-4 shadow-sm backdrop-blur dark:border-emerald-800/70 dark:bg-emerald-950/25">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-1">
                                        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            <TagIcon className="h-3.5 w-3.5" />
                                            Tags da audiência
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Adicione ou remova tags sem sair do modal de detalhes.
                                        </p>
                                    </div>

                                    <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="rounded-2xl border-emerald-300/80 bg-emerald-50/90 text-emerald-900 shadow-sm hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-50 dark:hover:bg-emerald-900/60"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Adicionar tag
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            align="end"
                                            className="w-[360px] rounded-3xl border-emerald-300/70 bg-[linear-gradient(180deg,rgba(240,253,244,0.98),rgba(220,252,231,0.97))] p-3 shadow-2xl dark:border-emerald-900/70 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(3,57,46,0.97))]"
                                        >
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold">Selecionar ou criar tag</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Busque uma tag existente ou crie uma nova para esta audiência.
                                                    </p>
                                                </div>

                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        value={tagSearch}
                                                        onChange={(e) => setTagSearch(e.target.value)}
                                                        placeholder="Buscar ou criar tag"
                                                        className="h-11 rounded-2xl border-emerald-300/80 bg-white/90 pl-9 shadow-sm dark:border-emerald-800/80 dark:bg-emerald-950/50"
                                                    />
                                                </div>

                                                <ScrollArea className="h-[220px] rounded-2xl border border-emerald-200/80 bg-white/60 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                                    <div className="space-y-1 p-2">
                                                        {filteredTags.map((tag) => {
                                                            const colors = getTagColor(tag.name);
                                                            const isSelected = selectedTagIds.has(tag.id);

                                                            return (
                                                                <button
                                                                    key={tag.id}
                                                                    type="button"
                                                                    className={cn(
                                                                        "flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-all",
                                                                        isSelected
                                                                            ? "border-emerald-400/80 bg-emerald-100/80 dark:border-emerald-700 dark:bg-emerald-900/40"
                                                                            : "border-transparent bg-transparent hover:border-emerald-200 hover:bg-emerald-50/80 dark:hover:border-emerald-900 dark:hover:bg-emerald-900/25"
                                                                    )}
                                                                    onClick={() => !isSelected && void handleAddTag(tag.name)}
                                                                    disabled={isSelected || savingTags}
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <span
                                                                            className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                                                                            style={{ backgroundColor: colors.text }}
                                                                        />
                                                                        <span className="truncate text-sm font-medium">{tag.name}</span>
                                                                    </div>
                                                                    {isSelected ? (
                                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-100">
                                                                            <Check className="h-3 w-3" />
                                                                            Vinculada
                                                                        </span>
                                                                    ) : null}
                                                                </button>
                                                            );
                                                        })}

                                                        {filteredTags.length === 0 ? (
                                                            <div className="rounded-2xl border border-dashed border-emerald-300/80 bg-emerald-50/70 px-4 py-6 text-center text-sm text-muted-foreground dark:border-emerald-800/80 dark:bg-emerald-900/20">
                                                                Nenhuma tag encontrada.
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </ScrollArea>

                                                {canCreateTag ? (
                                                    <Button
                                                        type="button"
                                                        className="h-11 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                                                        onClick={() => void handleAddTag(tagSearch)}
                                                        disabled={savingTags}
                                                    >
                                                        {savingTags ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Plus className="mr-2 h-4 w-4" />
                                                        )}
                                                        Criar e adicionar "{tagSearch.trim()}"
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {selectedTags.length > 0 ? (
                                        selectedTags.map((tag) => {
                                            const colors = getTagColor(tag.name);
                                            return (
                                                <span
                                                    key={tag.id}
                                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm"
                                                    style={{
                                                        backgroundColor: colors.bg,
                                                        color: colors.text,
                                                        borderColor: colors.border,
                                                    }}
                                                >
                                                    <TagIcon className="h-3 w-3 opacity-70" />
                                                    {tag.name}
                                                    <button
                                                        type="button"
                                                        className="rounded-full p-0.5 transition-opacity hover:opacity-80"
                                                        onClick={() => void handleRemoveTag(tag)}
                                                        aria-label={`Remover tag ${tag.name}`}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-emerald-300/80 bg-emerald-50/70 px-4 py-3 text-sm text-muted-foreground dark:border-emerald-800/80 dark:bg-emerald-900/20">
                                            Essa audiência ainda não possui tags.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-emerald-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(220,252,231,0.75))] px-4 py-3 shadow-sm backdrop-blur dark:border-emerald-800/70 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.45),rgba(4,47,36,0.72))]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contatos totais</p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight">{totalCount.toLocaleString()}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(220,252,231,0.75))] px-4 py-3 shadow-sm backdrop-blur dark:border-emerald-800/70 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.45),rgba(4,47,36,0.72))]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Página atual</p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight">{page}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(220,252,231,0.75))] px-4 py-3 shadow-sm backdrop-blur dark:border-emerald-800/70 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.45),rgba(4,47,36,0.72))]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultados nesta página</p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight">{contacts.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-emerald-300/60 bg-[linear-gradient(to_right,rgba(187,247,208,0.36),rgba(220,252,231,0.22))] px-6 py-4 dark:border-emerald-900/60 dark:bg-[linear-gradient(to_right,rgba(6,95,70,0.42),rgba(4,47,36,0.24))]">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="relative w-full md:max-w-xl">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Buscar por nome ou telefone"
                                    className="h-11 rounded-2xl border-emerald-300/80 bg-white/90 pl-9 shadow-sm shadow-emerald-950/5 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-foreground dark:placeholder:text-emerald-100/45"
                                />
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="rounded-full border-emerald-300/80 bg-emerald-50/80 px-3 py-1 shadow-sm dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-100">
                                    {contacts.length} na página
                                </Badge>
                                <Badge variant="outline" className="rounded-full border-emerald-300/80 bg-emerald-50/80 px-3 py-1 shadow-sm dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-100">
                                    Página {page}{totalPages > 0 ? ` de ${totalPages}` : ""}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,rgba(220,252,231,0.42),rgba(236,253,245,0.82),rgba(220,252,231,0.36))] dark:bg-[linear-gradient(180deg,rgba(6,78,59,0.16),rgba(2,24,21,0.1),rgba(4,47,36,0.18))]">
                    <ScrollArea className="h-full min-h-0">
                        <div className="px-6 py-5">
                            {loading ? (
                                <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-emerald-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(220,252,231,0.72))] shadow-sm dark:border-emerald-800/70 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(4,47,36,0.72))]">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Carregando contatos...
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[24px] border border-emerald-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(220,252,231,0.72))] text-center shadow-sm dark:border-emerald-800/70 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(4,47,36,0.72))]">
                                    <p className="text-sm text-muted-foreground">{error}</p>
                                    <Button variant="outline" className="rounded-xl dark:border-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40" onClick={() => setReloadToken((value) => value + 1)}>
                                        Tentar novamente
                                    </Button>
                                </div>
                            ) : contacts.length > 0 ? (
                                <div className="overflow-hidden rounded-[24px] border border-emerald-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,253,244,0.88))] shadow-sm dark:border-emerald-800/70 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.92),rgba(3,57,46,0.88))]">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur dark:bg-emerald-950/85">
                                            <TableRow>
                                                <TableHead className="w-[180px]">Telefone</TableHead>
                                                <TableHead className="w-[220px]">Nome</TableHead>
                                                <TableHead>Metadados</TableHead>
                                                <TableHead className="w-[160px]">Adicionado em</TableHead>
                                                <TableHead className="w-[120px] text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {contacts.map((contact) => (
                                                <TableRow key={contact.id || `${contact.audience_id}-${contact.phone_number}`} className="transition-colors hover:bg-emerald-500/[0.04] dark:hover:bg-emerald-400/[0.06]">
                                                    <TableCell className="font-mono text-xs">
                                                        <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium tracking-wide text-emerald-800 dark:border-emerald-700/80 dark:bg-emerald-900/50 dark:text-emerald-100">
                                                            {contact.phone_number}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {contact.name || "-"}
                                                    </TableCell>
                                                    <TableCell className="max-w-[360px] text-xs text-muted-foreground">
                                                        <span className="line-clamp-2 rounded-2xl border border-emerald-200/80 bg-emerald-100/55 px-3 py-2 dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-50/90">
                                                            {formatMetadataPreview(contact.metadata)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <CalendarDays className="h-3.5 w-3.5" />
                                                            {contact.created_at
                                                                ? new Date(contact.created_at).toLocaleString()
                                                                : "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn("h-9 rounded-full px-3 text-destructive transition-all hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20")}
                                                            onClick={() => setContactToRemove(contact)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Remover contato</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[24px] border border-emerald-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(220,252,231,0.72))] text-center shadow-sm dark:border-emerald-800/70 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(4,47,36,0.72))]">
                                    <Users className="h-10 w-10 text-muted-foreground/60" />
                                    <div className="space-y-1">
                                        <p className="font-medium">
                                            {debouncedSearch ? "Nenhum contato encontrado para a busca." : "Nenhum contato encontrado."}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Use o botão de adicionar para incluir novos contatos nesta audiência.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    </div>

                    <div className="border-t border-emerald-300/60 bg-[linear-gradient(to_right,rgba(240,253,244,0.94),rgba(220,252,231,0.9))] px-6 py-4 backdrop-blur dark:border-emerald-900/60 dark:bg-[linear-gradient(to_right,rgba(4,47,36,0.96),rgba(6,78,59,0.84))]">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-muted-foreground">
                                {totalCount > 0
                                    ? `${totalCount} contato(s) no total`
                                    : "Sem contatos cadastrados"}
                            </p>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="rounded-xl dark:border-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40"
                                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                                    disabled={page <= 1 || loading}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl dark:border-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40"
                                    onClick={() => setPage((value) => value + 1)}
                                    disabled={totalPages === 0 || page >= totalPages || loading}
                                >
                                    Próxima
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!contactToRemove} onOpenChange={(open) => !open && setContactToRemove(null)}>
                <AlertDialogContent className="rounded-2xl border-emerald-300/70 bg-[linear-gradient(180deg,rgba(240,253,244,0.98),rgba(220,252,231,0.95))] dark:border-emerald-900/70 dark:bg-[linear-gradient(180deg,rgba(4,47,36,0.98),rgba(3,57,46,0.96))]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover contato da audiência?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {contactToRemove
                                ? `Essa ação remove ${contactToRemove.name || contactToRemove.phone_number} da audiência ${audienceName}.`
                                : "Essa ação remove o contato da audiência."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => contactToRemove && void handleRemove(contactToRemove)}
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default AudienceDetailsDialog;
