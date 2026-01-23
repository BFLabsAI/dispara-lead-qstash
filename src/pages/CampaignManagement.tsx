import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { campaignManagementService } from '../services/campaignManagementService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Play, Pause, XCircle, Save, ArrowLeft,
    MessageSquare, CheckCircle, AlertCircle, Clock, Image as ImageIcon, Loader2
} from 'lucide-react';
import { useDisparadorStore } from '@/store/disparadorStore';
import { showSuccess, showError } from '@/utils/toast';

interface CampaignStats {
    total: number;
    sent: number;
    failed: number;
    queued: number;
    paused: number;
}

export default function CampaignManagement() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState<any>(null);
    const [stats, setStats] = useState<CampaignStats>({ total: 0, sent: 0, failed: 0, queued: 0, paused: 0 });
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    // Edit State is now an array of messages representing the sequence
    const [messages, setMessages] = useState<any[]>([]);

    // Store for media upload
    const { mediaUpload, reprocessCampaign } = useDisparadorStore();

    const fetchCampaign = async () => {
        if (!id) return;
        try {
            // 1. Fetch Campaign Details
            const { data, error } = await supabase
                .from('campaigns_dispara_lead_saas_02')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setCampaign(data);

            // 2. Fetch one contact to determine the message sequence (Template)
            const { data: contactData } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .select('phone_number')
                .eq('campaign_id', id)
                .limit(1);

            let messageSequence: any[] = [];
            let isAI = false;

            if (data.content_configuration) {
                // Source of Truth: Configuration JSON
                messageSequence = data.content_configuration.messages;
                isAI = data.content_configuration.use_ai;
            } else if (contactData && contactData.length > 0) {
                const phoneNumber = contactData[0].phone_number;

                // 3. Fetch all messages for this contact to build the sequence
                const { data: sequenceLogs } = await supabase
                    .from('message_logs_dispara_lead_saas_03')
                    .select('message_content, media_url, message_type, created_at')
                    .eq('campaign_id', id)
                    .eq('phone_number', phoneNumber)
                    .order('created_at', { ascending: true });

                if (sequenceLogs) {
                    messageSequence = sequenceLogs.map(log => ({
                        content: log.message_content || '',
                        mediaUrl: log.media_url || null,
                        type: log.message_type || 'texto',
                        originalType: log.message_type
                    }));
                }
            } else {
                messageSequence = [{ type: 'texto', content: '', mediaUrl: null }];
            }

            // Fallback for AI flag if not in config
            if (!data.content_configuration) {
                // Fetch logs to check for AI usage
                const { data: logsData } = await supabase
                    .from('message_logs_dispara_lead_saas_03')
                    .select('metadata')
                    .eq('campaign_id', id)
                    .limit(1)
                    .single();

                isAI = logsData?.metadata?.ai_rewritten === true;
            }

            const campaignData = {
                ...data,
                messages: messageSequence,
                use_ai: isAI
            };

            setCampaign(campaignData);
            setMessages(messageSequence);

            // Fetch Stats
            fetchStats();
        } catch (error) {
            console.error('Error fetching campaign:', error);
            showError('Erro ao carregar campanha');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        if (!id) return;
        const { data, error } = await supabase
            .from('message_logs_dispara_lead_saas_03')
            .select('status')
            .eq('campaign_id', id);

        if (data) {
            const newStats = {
                total: data.length,
                sent: data.filter(r => r.status === 'sent').length,
                failed: data.filter(r => r.status === 'failed').length,
                queued: data.filter(r => r.status === 'queued' || r.status === 'pending').length,
                paused: data.filter(r => r.status === 'paused').length,
            };
            setStats(newStats);
        }
    };

    useEffect(() => {
        fetchCampaign();
        // Poll for stats every 5s
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [id]);

    const handlePause = async () => {
        if (!id) return;
        try {
            setLoading(true);
            await campaignManagementService.pauseCampaign(id);
            fetchCampaign();
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        if (!id) return;
        try {
            setLoading(true);
            await campaignManagementService.resumeCampaign(id);
            fetchCampaign();
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!id) return;
        if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
        try {
            setLoading(true);
            await campaignManagementService.cancelCampaign(id);
            fetchCampaign();
        } finally {
            setLoading(false);
        }
    };

    const handleSaveContent = async () => {
        if (!id || !campaign) return;
        try {
            setLoading(true);
            // Use the new reprocessing logic
            await reprocessCampaign(id, {
                use_ai: campaign.use_ai, // TODO: Make this editable? For now, preserve existing setting.
                messages: messages
            });
            await fetchCampaign(); // Reload to confirm state
        } catch (error) {
            console.error("Save failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMessage = (index: number, field: string, value: any) => {
        const newMessages = [...messages];
        newMessages[index] = { ...newMessages[index], [field]: value };
        setMessages(newMessages);
    };

    const handleFileUploadForMessage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Determine type
        const type = file.type.startsWith('image') ? 'imagem' : file.type.startsWith('video') ? 'video' : 'audio';

        const url = await mediaUpload(file);
        if (url) {
            const newMessages = [...messages];
            newMessages[index] = { ...newMessages[index], mediaUrl: url, type: type };
            setMessages(newMessages);
        }
    };

    if (loading && !campaign) return <div className="p-8">Carregando...</div>;
    if (!campaign) return <div className="p-8">Campanha não encontrada.</div>;

    const isEditable = campaign.status !== 'cancelled' && campaign.status !== 'completed';

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold flex flex-wrap items-center gap-3">
                        {campaign.name}
                        {(() => {
                            const isFuture = campaign.scheduled_for && new Date(campaign.scheduled_for) > new Date();
                            if (campaign.status === 'processing' && isFuture) {
                                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Agendada</Badge>;
                            }

                            return (
                                <Badge variant={
                                    campaign.status === 'processing' ? 'default' :
                                        campaign.status === 'paused' ? 'secondary' :
                                            campaign.status === 'cancelled' ? 'destructive' :
                                                campaign.status === 'completed' ? 'outline' : 'default'
                                }>
                                    {campaign.status === 'processing' && 'Em Andamento'}
                                    {campaign.status === 'paused' && 'Pausada'}
                                    {campaign.status === 'cancelled' && 'Cancelada'}
                                    {campaign.status === 'completed' && 'Concluída'}
                                    {campaign.status === 'pending' && 'Pendente'}
                                </Badge>
                            );
                        })()}
                    </h1>
                    <p className="text-muted-foreground text-sm">Criado em {new Date(campaign.created_at).toLocaleString()}</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    {campaign.status === 'processing' && (
                        <Button variant="secondary" onClick={handlePause} disabled={loading} className="whitespace-nowrap">
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
                            Pausar
                        </Button>
                    )}
                    {campaign.status === 'paused' && (
                        <Button variant="default" onClick={handleResume} disabled={loading} className="whitespace-nowrap">
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                            Retomar
                        </Button>
                    )}
                    {(campaign.status === 'processing' || campaign.status === 'paused' || campaign.status === 'pending') && (
                        <Button variant="destructive" onClick={handleCancel} disabled={loading} className="whitespace-nowrap">
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                            Cancelar
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total</p>
                            <h2 className="text-xl sm:text-2xl font-bold">{stats.total}</h2>
                        </div>
                        <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500/20" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Enviadas</p>
                            <h2 className="text-xl sm:text-2xl font-bold text-green-600">{stats.sent}</h2>
                        </div>
                        <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500/20" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Falhas</p>
                            <h2 className="text-xl sm:text-2xl font-bold text-red-600">{stats.failed}</h2>
                        </div>
                        <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500/20" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                                {stats.paused > 0 ? 'Pausadas' : 'Na Fila'}
                            </p>
                            <h2 className="text-xl sm:text-2xl font-bold text-orange-600">
                                {stats.paused > 0 ? stats.paused : stats.queued}
                            </h2>
                        </div>
                        <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500/20" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Content Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Sequência de Mensagens</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {messages.map((msg, index) => (
                                <div key={index} className="p-4 border rounded-lg bg-card/50 text-card-foreground relative">
                                    <div className="absolute top-2 right-2 flex items-center gap-2">
                                        <Badge variant="outline">{msg.type === 'texto' ? 'Texto' : 'Mídia: ' + msg.type}</Badge>
                                    </div>
                                    <p className="text-xs font-semibold uppercase mb-2 text-muted-foreground">Mensagem {index + 1}</p>

                                    <div className="space-y-4">
                                        {/* TEXT AREA */}
                                        <div className="space-y-2">
                                            <Label>Texto</Label>
                                            <Textarea
                                                value={msg.content}
                                                onChange={(e) => handleUpdateMessage(index, 'content', e.target.value)}
                                                disabled={!isEditable}
                                                className="min-h-[200px] sm:min-h-[300px] bg-background text-foreground"
                                                placeholder={msg.type !== 'texto' ? 'Legenda (opcional)' : 'Conteúdo da mensagem'}
                                            />
                                            {msg.type === 'texto' && (
                                                <p className="text-xs text-muted-foreground opacity-70">
                                                    Atenção: Editar este texto sobrescreverá o conteúdo original (incluindo variáveis como nome).
                                                </p>
                                            )}
                                        </div>

                                        {/* MEDIA AREA */}
                                        {msg.type !== 'texto' && (
                                            <div className="space-y-2">
                                                <Label>Arquivo de Mídia</Label>
                                                {msg.mediaUrl ? (
                                                    <div className="relative w-full sm:w-48 rounded-lg overflow-hidden border bg-background">
                                                        {msg.type === 'video' ? (
                                                            <video src={msg.mediaUrl} controls className="w-full h-auto" />
                                                        ) : msg.type === 'audio' ? (
                                                            <audio src={msg.mediaUrl} controls className="w-full" />
                                                        ) : (
                                                            <img src={msg.mediaUrl} alt="Midia" className="w-full h-auto object-cover" />
                                                        )}
                                                        {isEditable && (
                                                            <Button
                                                                variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6"
                                                                onClick={() => handleUpdateMessage(index, 'mediaUrl', null)}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-32 w-full sm:w-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20 text-muted-foreground text-sm">
                                                        Sem mídia
                                                    </div>
                                                )}

                                                {isEditable && (
                                                    <div className="space-y-3 mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                id={`media-upload-${index}`}
                                                                type="file"
                                                                accept="image/*,video/*,audio/*"
                                                                onChange={(e) => handleFileUploadForMessage(index, e)}
                                                                className="hidden"
                                                            />
                                                            <Button variant="outline" size="sm" onClick={() => document.getElementById(`media-upload-${index}`)?.click()}>
                                                                <ImageIcon className="h-4 w-4 mr-2" />
                                                                Trocar Arquivo
                                                            </Button>
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
                                                                value={msg.mediaUrl || ''}
                                                                onChange={(e) => handleUpdateMessage(index, 'mediaUrl', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isEditable && messages.length > 0 && (
                                <div className="pt-4 border-t">
                                    <Button onClick={handleSaveContent} className="w-full sm:w-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        Salvar Todas as Alterações
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        As alterações serão aplicadas a todas as mensagens <strong>pendentes</strong> desta campanha.
                                        Mensagens já enviadas não serão afetadas.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Info Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Detalhes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <span className="font-semibold block">Público Alvo</span>
                                <span className="text-muted-foreground break-all">{campaign.target_audience}</span>
                            </div>
                            <div>
                                <span className="font-semibold block">Instâncias</span>
                                <span className="text-muted-foreground">
                                    {Array.isArray(campaign.instances) ? campaign.instances.join(', ') : campaign.instances}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold block">Agendamento</span>
                                <span className="text-muted-foreground">
                                    {campaign.is_scheduled && campaign.scheduled_for
                                        ? new Date(campaign.scheduled_for).toLocaleString()
                                        : 'Envio Imediato'}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold block">Inteligência Artificial</span>
                                <span className="text-muted-foreground">
                                    <div className="flex items-center space-x-2 mt-1">
                                        {isEditable ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="use_ai_toggle"
                                                    checked={!!campaign.use_ai}
                                                    onChange={(e) => setCampaign({ ...campaign, use_ai: e.target.checked })}
                                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <label htmlFor="use_ai_toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Utilizar IA
                                                </label>
                                            </div>
                                        ) : (
                                            campaign.use_ai ? (
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                                    Utilizada
                                                </Badge>
                                            ) : (
                                                'Não utilizada'
                                            )
                                        )}
                                    </div>
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
