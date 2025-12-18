import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface EmailTemplate {
    type: string;
    subject: string;
    html_content: string;
}

export default function EmailTemplatesPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('invite');

    // Local state for editing
    const [subject, setSubject] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // 1. Fetch Template
    const { data: template, isLoading, isFetching } = useQuery({
        queryKey: ['emailTemplate', activeTab],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('email_templates_dispara_lead_saas')
                .select('*')
                .eq('type', activeTab)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Allow not found (but migration seeds it)
            return data as EmailTemplate;
        }
    });

    // Sync state with fetching
    useEffect(() => {
        if (template) {
            setSubject(template.subject);
            setHtmlContent(template.html_content);
            setIsDirty(false);
        }
    }, [template]);

    // 2. Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('email_templates_dispara_lead_saas')
                .upsert({
                    type: activeTab,
                    subject: subject,
                    html_content: htmlContent,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Template salvo com sucesso!" });
            setIsDirty(false);
            queryClient.invalidateQueries({ queryKey: ['emailTemplate', activeTab] });
        },
        onError: (error: Error) => {
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        }
    });

    const handleSave = () => {
        saveMutation.mutate();
    };

    const handleChangeSubject = (val: string) => {
        setSubject(val);
        setIsDirty(true);
    };

    const handleChangeHtml = (val: string) => {
        setHtmlContent(val);
        setIsDirty(true);
    };

    // Preview replacement
    const getPreviewHtml = () => {
        if (!htmlContent) return '';
        let preview = htmlContent;
        // Replace variables with dummies for preview
        preview = preview.replaceAll('{{name}}', 'João Silva');
        preview = preview.replaceAll('{{action_url}}', '#');
        preview = preview.replaceAll('{{email}}', 'joao@exemplo.com');
        return preview;
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Templates de Email</h1>
                    <p className="text-muted-foreground">Personalize os emails transacionais enviados pelo sistema.</p>
                </div>
                <Button onClick={handleSave} disabled={!isDirty || saveMutation.isPending || isLoading}>
                    {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList>
                    <TabsTrigger value="invite">Convite (Invite)</TabsTrigger>
                    <TabsTrigger value="recovery">Recuperação de Senha</TabsTrigger>
                    {/* Signup removed as per latest plan */}
                </TabsList>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 h-full min-h-0">
                    {/* Editor Side */}
                    <Card className="flex flex-col h-full min-h-0">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Editor HTML</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
                            <div className="space-y-2">
                                <Label>Assunto do Email</Label>
                                <Input
                                    value={subject}
                                    onChange={e => handleChangeSubject(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2 flex-1 flex flex-col min-h-0">
                                <Label>Conteúdo HTML</Label>
                                <div className="text-xs text-muted-foreground mb-1">
                                    Variáveis disponíveis: <code className="bg-muted px-1 rounded">{'{{name}}'}</code>, <code className="bg-muted px-1 rounded">{'{{action_url}}'}</code>, <code className="bg-muted px-1 rounded">{'{{email}}'}</code>
                                </div>
                                <Textarea
                                    className="flex-1 font-mono text-xs resize-none"
                                    value={htmlContent}
                                    onChange={e => handleChangeHtml(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview Side */}
                    <Card className="flex flex-col h-full min-h-0 bg-muted/30">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-medium">Visualização</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: template ? ['emailTemplate', activeTab] : [] })}>
                                <RotateCw className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden rounded-b-lg">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <iframe
                                    className="w-full h-full bg-white"
                                    srcDoc={getPreviewHtml()}
                                    title="Preview"
                                    sandbox="allow-same-origin"
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Tabs>
        </div>
    );
}
