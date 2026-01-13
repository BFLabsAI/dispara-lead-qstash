import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Plus, Pause, Play, XCircle, Loader2, Filter, Zap, CheckCircle2, Clock, BarChart3, Search } from 'lucide-react';
import { campaignManagementService } from '../services/campaignManagementService';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from '@/components/layout/PageHeader';
import { Separator } from '@/components/ui/separator';

export default function CampaignList() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [instanceFilter, setInstanceFilter] = useState('all');

    const fetchCampaigns = async () => {
        try {
            const { data, error } = await supabase
                .from('campaigns_dispara_lead_saas_02')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampaigns(data || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    // Unique Instances for Filter
    const uniqueInstances = useMemo(() => {
        const instances = new Set<string>();
        campaigns.forEach(c => {
            if (Array.isArray(c.instances)) {
                c.instances.forEach((i: string) => instances.add(i));
            }
        });
        return Array.from(instances).sort();
    }, [campaigns]);

    // Filter and Sort Validation
    const filteredAndSortedCampaigns = useMemo(() => {
        let result = [...campaigns];

        // 1. Filter by Status
        if (statusFilter !== 'all') {
            result = result.filter(c => {
                if (statusFilter === 'agendada') return ['processing', 'pending'].includes(c.status);
                return c.status === statusFilter;
            });
        }

        // 2. Filter by Instance
        if (instanceFilter !== 'all') {
            result = result.filter(c =>
                Array.isArray(c.instances) && c.instances.includes(instanceFilter)
            );
        }

        // 3. Sort: Agendado (Active) > Concluido > Cancelado
        result.sort((a, b) => {
            const getScore = (status: string) => {
                if (['processing', 'pending', 'paused'].includes(status)) return 0;
                if (status === 'completed') return 1;
                if (status === 'cancelled') return 2;
                return 3;
            };

            const scoreA = getScore(a.status);
            const scoreB = getScore(b.status);

            if (scoreA !== scoreB) {
                return scoreA - scoreB;
            }

            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return result;
    }, [campaigns, statusFilter, instanceFilter]);

    // Metrics for Cards
    const metrics = useMemo(() => {
        const total = campaigns.length;
        const active = campaigns.filter(c => ['processing', 'pending'].includes(c.status)).length;
        const completed = campaigns.filter(c => c.status === 'completed').length;
        return { total, active, completed };
    }, [campaigns]);


    const getStatusBadge = (status: string, scheduledFor?: string) => {
        const isFuture = scheduledFor && new Date(scheduledFor) > new Date();

        const badgeBase = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border";

        if (status === 'processing' && isFuture) {
            return (
                <span className={`${badgeBase} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`}>
                    <Clock className="w-3 h-3" />
                    Agendada
                </span>
            );
        }

        switch (status) {
            case 'processing':
                return (
                    <span className={`${badgeBase} border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 relative`}>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Em Andamento
                    </span>
                );
            case 'paused':
                return (
                    <span className={`${badgeBase} border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`}>
                        <Pause className="w-3 h-3" />
                        Pausada
                    </span>
                );
            case 'cancelled':
                return (
                    <span className={`${badgeBase} border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300`}>
                        <XCircle className="w-3 h-3" />
                        Cancelada
                    </span>
                );
            case 'completed':
                return (
                    <span className={`${badgeBase} border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500 dark:text-white shadow-sm`}>
                        <CheckCircle2 className="w-3 h-3" />
                        Concluída
                    </span>
                );
            case 'pending':
                return (
                    <span className={`${badgeBase} border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300`}>
                        <Clock className="w-3 h-3" />
                        Pendente
                    </span>
                );
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handlePause = async (id: string) => {
        try {
            setActioningId(id);
            await campaignManagementService.pauseCampaign(id);
            fetchCampaigns();
        } finally {
            setActioningId(null);
        }
    };

    const handleResume = async (id: string) => {
        try {
            setActioningId(id);
            await campaignManagementService.resumeCampaign(id);
            fetchCampaigns();
        } finally {
            setActioningId(null);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
        try {
            setActioningId(id);
            await campaignManagementService.cancelCampaign(id);
            fetchCampaigns();
        } finally {
            setActioningId(null);
        }
    };

    if (loading && campaigns.length === 0) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-500" /></div>;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Campanhas"
                subtitle="Gerencie, monitore e otimize seus disparos de mensagens."
                extra={
                    <Button
                        onClick={() => navigate('/agendar-campanha')}
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Campanha
                    </Button>
                }
            />

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-100 dark:border-emerald-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            Total de Campanhas
                        </CardTitle>
                        <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total}</div>
                        <p className="text-xs text-muted-foreground">Campanhas criadas</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/5 to-lime-500/5 border-green-100 dark:border-green-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                            Em Andamento
                        </CardTitle>
                        <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.active}</div>
                        <p className="text-xs text-muted-foreground">Disparos ativos ou agendados</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-teal-500/5 to-cyan-500/5 border-teal-100 dark:border-teal-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-teal-600 dark:text-teal-400">
                            Concluídas
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.completed}</div>
                        <p className="text-xs text-muted-foreground">Campanhas finalizadas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Toolbar */}
            <div className="backdrop-blur-xl bg-card/40 border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Filtros</span>
                    <Separator orientation="vertical" className="h-4 mx-2" />
                </div>

                <div className="flex-1 flex gap-4 w-full md:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[200px] border-none bg-background/50 focus:ring-1 focus:ring-emerald-500">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="agendada">Agendada / Em Andamento</SelectItem>
                            <SelectItem value="paused">Pausada</SelectItem>
                            <SelectItem value="completed">Concluída</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                        <SelectTrigger className="w-full md:w-[250px] border-none bg-background/50 focus:ring-1 focus:ring-emerald-500">
                            <SelectValue placeholder="Instância" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Instâncias</SelectItem>
                            {uniqueInstances.map(instance => (
                                <SelectItem key={instance} value={instance}>
                                    {instance}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {(statusFilter !== 'all' || instanceFilter !== 'all') && (
                    <Button
                        variant="ghost"
                        onClick={() => { setStatusFilter('all'); setInstanceFilter('all'); }}
                        className="text-sm hover:text-emerald-500"
                    >
                        Limpar
                    </Button>
                )}
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-lg shadow-emerald-500/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-b border-border/50">
                            <TableHead className="py-4">Nome da Campanha</TableHead>
                            <TableHead className="py-4">Instância</TableHead>
                            <TableHead className="py-4">Status</TableHead>
                            <TableHead className="py-4">Agendamento</TableHead>
                            <TableHead className="py-4 text-center">Volume</TableHead>
                            <TableHead className="py-4 text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedCampaigns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                                    <Search className="h-8 w-8 opacity-20" />
                                    <span>Nenhuma campanha encontrada com os filtros atuais.</span>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSortedCampaigns.map((campaign) => (
                                <TableRow key={campaign.id} className="group hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0">
                                    <TableCell className="font-medium py-3">
                                        <div className="flex flex-col">
                                            <span className="text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pointer-events-none">
                                                {campaign.name}
                                            </span>
                                            <div className="text-xs text-muted-foreground md:hidden mt-1">
                                                {new Date(campaign.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {campaign.instances && campaign.instances.map((inst: string, idx: number) => (
                                                <Badge key={idx} variant="outline" className="text-xs border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                                                    {inst}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(campaign.status, campaign.scheduled_for)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            {campaign.is_scheduled && campaign.scheduled_for ? (
                                                <>
                                                    <span className="font-medium">
                                                        {new Date(campaign.scheduled_for).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(campaign.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">Envio Imediato</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="px-3 bg-slate-100 dark:bg-slate-800">
                                            {campaign.total_messages}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {(campaign.status === 'processing' || campaign.status === 'pending') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                    disabled={actioningId === campaign.id}
                                                    onClick={() => handlePause(campaign.id)}
                                                    title="Pausar"
                                                >
                                                    {actioningId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                                                </Button>
                                            )}
                                            {campaign.status === 'paused' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                                    disabled={actioningId === campaign.id}
                                                    onClick={() => handleResume(campaign.id)}
                                                    title="Retomar"
                                                >
                                                    {actioningId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                                </Button>
                                            )}
                                            {!['completed', 'cancelled'].includes(campaign.status) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    disabled={actioningId === campaign.id}
                                                    onClick={() => handleCancel(campaign.id)}
                                                    title="Cancelar"
                                                >
                                                    {actioningId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => navigate(`/campanhas/${campaign.id}`)}
                                                title="Configurações"
                                            >
                                                <Settings className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
