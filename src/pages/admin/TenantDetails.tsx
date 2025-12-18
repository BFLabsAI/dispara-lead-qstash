import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, RefreshCw, LayoutDashboard, Pencil, AlertTriangle, Database } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInstance, deleteInstance, type UazapiInstance } from "@/services/uazapiClient";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'inactive' | 'suspended';
    plan_id: string | null;
}

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

interface Instance {
    id: string;
    instance_name: string;
    status: string;
    connection_status: string;
}

interface Plan {
    id: string;
    name: string;
}

export default function TenantDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const setImpersonatedTenantId = useAdminStore((state) => state.setImpersonatedTenantId);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [instances, setInstances] = useState<UazapiInstance[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [newInstanceName, setNewInstanceName] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteFormData, setInviteFormData] = useState({
        email: "",
        fullName: "",
        role: "member"
    });
    const [editFormData, setEditFormData] = useState({
        name: "",
        slug: "",
        status: "",
        plan_id: ""
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load Tenant
            const { data: tenantData, error: tenantError } = await supabase
                .from('tenants_dispara_lead_saas_02')
                .select('*')
                .eq('id', id)
                .single();

            if (tenantError) throw tenantError;
            setTenant(tenantData);
            setEditFormData({
                name: tenantData.name,
                slug: tenantData.slug,
                status: tenantData.status,
                plan_id: tenantData.plan_id || ""
            });

            // Load Users
            const { data: usersData } = await supabase
                .from('users_dispara_lead_saas_02')
                .select('*')
                .eq('tenant_id', id);
            setUsers(usersData || []);

            // Load Instances
            console.log('Loading instances for tenant:', id);
            const { data: instancesData, error: instancesError } = await supabase
                .from('instances_dispara_lead_saas_02')
                .select('*')
                .eq('tenant_id', id);

            if (instancesError) {
                console.error('Error loading instances:', instancesError);
            } else {
                console.log('Instances loaded:', instancesData);
            }

            setInstances(instancesData || []);

            // Load Plans
            const { data: plansData } = await supabase
                .from('plans_dispara_lead_saas_02')
                .select('*');
            setPlans(plansData || []);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados",
                description: error.message
            });
            navigate('/admin/tenants');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, toast]);

    useEffect(() => {
        if (id) loadData();
    }, [id, loadData]);

    const handleUpdateTenant = async () => {
        try {
            const { error } = await supabase
                .from('tenants_dispara_lead_saas_02')
                .update({
                    name: editFormData.name,
                    slug: editFormData.slug,
                    status: editFormData.status,
                    plan_id: editFormData.plan_id === "" ? null : editFormData.plan_id
                })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Empresa atualizada",
                description: "As informações foram salvas com sucesso."
            });
            setIsEditModalOpen(false);
            loadData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar empresa",
                description: error.message
            });
        }
    };

    const handleInviteUser = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: {
                    action: 'invite',
                    tenant_id: id,
                    email: inviteFormData.email,
                    full_name: inviteFormData.fullName,
                    role: inviteFormData.role
                }
            });

            if (error) throw new Error(error.message || 'Erro ao chamar função');
            if (data?.error) throw new Error(data.error);

            toast({
                title: "Convite enviado",
                description: `Usuário ${inviteFormData.email} convidado com sucesso.`
            });

            setIsInviteModalOpen(false);
            setInviteFormData({ email: "", fullName: "", role: "member" });
            loadData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao convidar usuário",
                description: error.message
            });
        }
    };

    // ... (handleCreateInstance, handleDeleteInstance, handleAccessDashboard remain same)
    const handleCreateInstance = async () => {
        if (!newInstanceName) return;

        try {
            await createInstance(newInstanceName, id!); // id is tenant_id from params

            toast({
                title: "Instância criada",
                description: "A instância foi criada na UazAPI e registrada."
            });

            setNewInstanceName("");
            loadData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao criar instância",
                description: error.message
            });
        }
    };

    const handleDeleteInstance = async (instanceName: string) => {
        if (!confirm(`Tem certeza que deseja excluir a instância ${instanceName}?`)) return;

        try {
            await deleteInstance(instanceName, id!);

            toast({
                title: "Instância removida",
                description: "A instância foi removida com sucesso."
            });

            loadData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao remover instância",
                description: error.message
            });
        }
    };

    const handleAccessDashboard = () => {
        if (!tenant) return;
        setImpersonatedTenantId(tenant.id);
        navigate('/dashboard');
        toast({
            title: "Acesso Concedido",
            description: `Acessando painel de ${tenant.name}`,
        });
    };

    // --- Data Management Handlers ---
    const [flushLoading, setFlushLoading] = useState<string | null>(null);

    const handleFlushLogs = async () => {
        if (!confirm(`ATENÇÃO: Isso irá APAGAR PERMANENTEMENTE todos os logs de mensagens e campanhas da empresa "${tenant?.name}". Tem certeza?`)) return;
        setFlushLoading('logs');
        try {
            // Delete message logs
            const { error: logsError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .delete()
                .eq('tenant_id', id);
            if (logsError) throw logsError;

            // Delete campaigns
            const { error: campaignsError } = await supabase
                .from('campaigns_dispara_lead_saas_02')
                .delete()
                .eq('tenant_id', id);
            if (campaignsError) throw campaignsError;

            toast({ title: "Sucesso", description: "Logs e campanhas apagados com sucesso." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        } finally {
            setFlushLoading(null);
        }
    };

    const handleFlushAudiences = async () => {
        if (!confirm(`ATENÇÃO: Isso irá APAGAR PERMANENTEMENTE todos os públicos salvos da empresa "${tenant?.name}". Tem certeza?`)) return;
        setFlushLoading('audiences');
        try {
            // First delete contacts
            const { data: audiences } = await supabase
                .from('audiences_dispara_lead_saas_02')
                .select('id')
                .eq('tenant_id', id);

            if (audiences && audiences.length > 0) {
                const audienceIds = audiences.map(a => a.id);
                const { error: contactsError } = await supabase
                    .from('audience_contacts_dispara_lead_saas_02')
                    .delete()
                    .in('audience_id', audienceIds);
                if (contactsError) throw contactsError;
            }

            // Then delete audiences
            const { error: audiencesError } = await supabase
                .from('audiences_dispara_lead_saas_02')
                .delete()
                .eq('tenant_id', id);
            if (audiencesError) throw audiencesError;

            toast({ title: "Sucesso", description: "Públicos apagados com sucesso." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        } finally {
            setFlushLoading(null);
        }
    };

    if (loading) return <div>Carregando...</div>;
    if (!tenant) return <div>Empresa não encontrada</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{tenant.name}</h2>
                    <p className="text-muted-foreground">Slug: {tenant.slug} | ID: {tenant.id}</p>
                </div>
                <div className="flex gap-2">

                    <Button onClick={handleAccessDashboard} variant="outline">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Acessar Painel
                    </Button>
                    <Badge variant={tenant.status === 'active' ? 'default' : 'destructive'}>
                        {tenant.status}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="instances">
                <TabsList>
                    <TabsTrigger value="instances">Instâncias Evolution</TabsTrigger>
                    <TabsTrigger value="users">Usuários</TabsTrigger>
                    <TabsTrigger value="settings">Configurações</TabsTrigger>
                    <TabsTrigger value="data-management">Gestão de Dados</TabsTrigger>
                </TabsList>

                <TabsContent value="instances" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerenciar Instâncias</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 mb-6">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="instanceName">Nome da Nova Instância</Label>
                                    <Input
                                        type="text"
                                        id="instanceName"
                                        placeholder="ex: empresa-whatsapp-1"
                                        value={newInstanceName}
                                        onChange={(e) => setNewInstanceName(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button onClick={handleCreateInstance}>
                                        <Plus className="mr-2 h-4 w-4" /> Adicionar
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {instances.map((instance) => (
                                    <div key={instance.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{instance.instance_name}</p>
                                            <div className="flex gap-2 mt-1">
                                                <Badge variant="outline">{instance.status}</Badge>
                                                <Badge variant={instance.connection_status === 'open' ? 'default' : 'secondary'}>
                                                    {instance.connection_status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteInstance(instance.instance_name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {instances.length === 0 && (
                                    <p className="text-muted-foreground text-center py-4">Nenhuma instância conectada.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Usuários da Empresa</CardTitle>
                            <Button onClick={() => setIsInviteModalOpen(true)} size="sm">
                                <Plus className="mr-2 h-4 w-4" /> Convidar Usuário
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {users.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <Badge>{user.role}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações da Empresa</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Nome da Empresa</Label>
                                    <p className="font-medium text-lg">{tenant.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Slug (Identificador)</Label>
                                    <p className="font-medium text-lg">{tenant.slug}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div>
                                        <Badge variant={tenant.status === 'active' ? 'default' : 'destructive'}>
                                            {tenant.status === 'active' ? 'Ativo' : tenant.status === 'inactive' ? 'Inativo' : 'Suspenso'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Plano Atual</Label>
                                    <p className="font-medium text-lg">
                                        {plans.find(p => p.id === tenant.plan_id)?.name || 'Sem plano'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Button onClick={() => setIsEditModalOpen(true)} variant="outline">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar Informações
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="data-management">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Gestão de Dados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                    <div>
                                        <p className="font-medium text-destructive">Zona de Perigo</p>
                                        <p className="text-sm text-muted-foreground">
                                            As ações nesta seção são irreversíveis. Todos os dados apagados não poderão ser recuperados.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">Limpar Logs e Campanhas</p>
                                        <p className="text-sm text-muted-foreground">
                                            Apaga todos os registros de mensagens enviadas e histórico de campanhas.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        onClick={handleFlushLogs}
                                        disabled={flushLoading !== null}
                                    >
                                        {flushLoading === 'logs' ? 'Apagando...' : 'Limpar Logs'}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">Limpar Públicos</p>
                                        <p className="text-sm text-muted-foreground">
                                            Apaga todos os públicos salvos e seus contatos associados.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        onClick={handleFlushAudiences}
                                        disabled={flushLoading !== null}
                                    >
                                        {flushLoading === 'audiences' ? 'Apagando...' : 'Limpar Públicos'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convidar Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={inviteFormData.email}
                                onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input
                                id="fullName"
                                value={inviteFormData.fullName}
                                onChange={(e) => setInviteFormData({ ...inviteFormData, fullName: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Função</Label>
                            <Select
                                value={inviteFormData.role}
                                onValueChange={(value) => setInviteFormData({ ...inviteFormData, role: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a função" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="member">Membro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleInviteUser}>Enviar Convite</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Empresa</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="slug">Slug</Label>
                            <Input
                                id="slug"
                                value={editFormData.slug}
                                onChange={(e) => setEditFormData({ ...editFormData, slug: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={editFormData.status}
                                onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="inactive">Inativo</SelectItem>
                                    <SelectItem value="suspended">Suspenso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="plan">Plano</Label>
                            <Select
                                value={editFormData.plan_id}
                                onValueChange={(value) => setEditFormData({ ...editFormData, plan_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o plano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateTenant}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
