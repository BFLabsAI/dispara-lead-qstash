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
import { Trash2, Plus, RefreshCw, LayoutDashboard, Pencil } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAllInstances, type EvolutionInstance } from "@/services/evolutionApi";

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
    const [instances, setInstances] = useState<Instance[]>([]);
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
                .from('tenants_dispara_lead_saas')
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
                .from('users_dispara_lead_saas')
                .select('*')
                .eq('tenant_id', id);
            setUsers(usersData || []);

            // Load Instances
            const { data: instancesData } = await supabase
                .from('instances_dispara_lead_saas')
                .select('*')
                .eq('tenant_id', id);

            // Fetch real-time status from Evolution API
            let evoInstances: EvolutionInstance[] = [];
            try {
                evoInstances = await fetchAllInstances();
            } catch (error) {
                console.error("Failed to fetch from Evolution API:", error);
            }

            // Merge DB data with real-time status
            const mergedInstances = (instancesData || []).map((dbInst: any) => {
                const evoInst = evoInstances.find(i => i.name === dbInst.instance_name);
                return {
                    ...dbInst,
                    connection_status: evoInst ? evoInst.status : (dbInst.connection_status || 'DISCONNECTED')
                };
            });

            setInstances(mergedInstances);

            // Load Plans
            const { data: plansData } = await supabase
                .from('plans_dispara_lead_saas')
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
                .from('tenants_dispara_lead_saas')
                .update({
                    name: editFormData.name,
                    slug: editFormData.slug,
                    status: editFormData.status,
                    plan_id: editFormData.plan_id || null
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
            const { data, error } = await supabase.functions.invoke('manage-instances', {
                body: {
                    action: 'create',
                    tenant_id: id,
                    instance_name: newInstanceName
                }
            });

            if (error) throw new Error(error.message || 'Erro ao chamar função');
            if (data.error) throw new Error(data.error);

            toast({
                title: "Instância criada",
                description: "A instância foi criada na Evolution API e registrada."
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
            const { data, error } = await supabase.functions.invoke('manage-instances', {
                body: {
                    action: 'delete',
                    tenant_id: id,
                    instance_name: instanceName
                }
            });

            if (error) throw new Error(error.message || 'Erro ao chamar função');
            if (data.error) throw new Error(data.error);

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
