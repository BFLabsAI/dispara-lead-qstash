"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { cn, getTagColor } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Search, Tag as TagIcon, Trash2, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AudienceSplitUpload } from "@/components/audience/AudienceSplitUpload";
import { audienceService, Audience } from "@/services/audienceService";
import { AudienceDetailsDialog } from "@/components/audience/AudienceDetailsDialog";
import { toast } from "sonner";
import { supabase } from "@/services/supabaseClient";

export const Audiences = () => {
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [uniqueTags, setUniqueTags] = useState<string[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        fetchAudiences();
    }, []);

    const fetchAudiences = async () => {
        setLoading(true);
        try {
            const data = await audienceService.getAudiences();
            setAudiences(data);

            // Extract unique tags
            const allTags = new Set<string>();
            data.forEach(a => a.tags?.forEach(t => allTags.add(t.name)));
            setUniqueTags(Array.from(allTags).sort());

        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar audiências.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir a audiência "${name}"?`)) return;

        try {
            const { error } = await supabase.from('audiences_dispara_lead_saas_02').delete().eq('id', id);
            if (error) throw error;
            toast.success("Audiência excluída.");
            fetchAudiences();
        } catch (error) {
            toast.error("Erro ao excluir.");
        }
    };

    const filteredAudiences = audiences.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = selectedTag ? a.tags?.some(t => t.name === selectedTag) : true;
        return matchesSearch && matchesTag;
    });

    return (
        <div className="space-y-8">
            <PageHeader
                title="Gestão de Audiências"
                subtitle="Organize seus contatos em listas segmentadas"
                extra={
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Nova Audiência
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Importar Contatos</DialogTitle>
                                <DialogDescription>
                                    Faça upload de uma planilha para criar novas audiências. Você pode dividir listas grandes automaticamente.
                                </DialogDescription>
                            </DialogHeader>
                            <AudienceSplitUpload onSuccess={() => { setDialogOpen(false); fetchAudiences(); }} />
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-lg border">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <Badge
                        variant={selectedTag === null ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedTag(null)}
                    >
                        Todas
                    </Badge>
                    {uniqueTags.map(tag => {
                        const colors = getTagColor(tag);
                        const isSelected = selectedTag === tag;
                        return (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="cursor-pointer transition-all border"
                                style={{
                                    backgroundColor: isSelected ? colors.text : colors.bg,
                                    color: isSelected ? '#fff' : colors.text,
                                    borderColor: colors.border
                                }}
                                onClick={() => setSelectedTag(isSelected ? null : tag)}
                            >
                                {tag}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-center col-span-full py-12 text-muted-foreground">Carregando audiências...</p>
                ) : filteredAudiences.length === 0 ? (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-medium text-muted-foreground">Nenhuma audiência encontrada</h3>
                        <p className="text-sm text-muted-foreground/80 mb-4">Crie sua primeira lista de contatos para começar.</p>
                    </div>
                ) : (
                    filteredAudiences.map((audience) => (
                        <Card key={audience.id} className="glass-card hover:border-primary/50 transition-colors group relative">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-semibold">{audience.name}</CardTitle>
                                        <CardDescription className="text-xs pt-1 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(audience.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AudienceDetailsDialog audienceId={audience.id} audienceName={audience.name} />
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(audience.id, audience.name)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                            <span className="sr-only">Excluir</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{audience.total_contacts.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Contatos registrados</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                                    {audience.tags && audience.tags.length > 0 ? (
                                        audience.tags.map((tag: any) => {
                                            const colors = getTagColor(tag.name);
                                            return (
                                                <Badge
                                                    key={tag.id}
                                                    variant="secondary"
                                                    className="text-xs font-normal border"
                                                    style={{
                                                        backgroundColor: colors.bg,
                                                        color: colors.text,
                                                        borderColor: colors.border
                                                    }}
                                                >
                                                    <TagIcon className="h-3 w-3 mr-1 opacity-50" />
                                                    {tag.name}
                                                </Badge>
                                            );
                                        })
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Sem tags</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default Audiences;
