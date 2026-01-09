import { useEffect, useState } from "react";
import { supabase } from "@/services/supabaseClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    plan_id: string; // Could join to get plan name
}

import { useNavigate } from "react-router-dom";

export default function TenantList() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    useEffect(() => {
        loadTenants();
        loadPlans();
    }, []);

    const loadPlans = async () => {
        const { data } = await supabase.from('plans_dispara_lead_saas_02').select('*');
        setPlans(data || []);
    };

    const loadTenants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tenants_dispara_lead_saas_02')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading tenants:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar empresas",
                description: error.message
            });
        } else {
            setTenants(data || []);
        }
        setLoading(false);
    };

    const handleCreateTenant = async () => {
        if (!newCompanyName.trim()) return;

        setCreateLoading(true);
        try {
            // Generate basic slug
            const slug = newCompanyName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '') + '-' + Math.floor(Math.random() * 1000);

            if (!selectedPlanId) {
                toast({
                    variant: "destructive",
                    title: "Selecione um plano",
                    description: "É necessário selecionar um plano para criar a empresa."
                });
                setCreateLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('tenants_dispara_lead_saas_02')
                .insert({
                    name: newCompanyName,
                    slug: slug,
                    status: 'active',
                    plan_id: selectedPlanId
                    // Note: owner_id is NOT set here. If it's mandatory, this might fail.
                    // The trigger usually handles creation from user signup.
                })
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Empresa criada com sucesso!",
                description: `A empresa ${newCompanyName} foi criada.`
            });

            setIsCreateModalOpen(false);
            setNewCompanyName("");
            loadTenants();

        } catch (error: any) {
            console.error("Error creating tenant:", error);
            toast({
                variant: "destructive",
                title: "Erro ao criar empresa",
                description: error.message || "Verifique se você tem permissão ou se o nome é inválido."
            });
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Gerenciar Empresas</h2>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button>Nova Empresa</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Empresa</DialogTitle>
                            <DialogDescription>
                                Crie uma nova empresa no sistema. Isso criará o registro do tenant.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nome
                                </Label>
                                <Input
                                    id="name"
                                    value={newCompanyName}
                                    onChange={(e) => setNewCompanyName(e.target.value)}
                                    placeholder="Ex: Minha Empresa Ltda"
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plan" className="text-right">
                                    Plano
                                </Label>
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione um plano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name} - R$ {plan.price}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateTenant} disabled={createLoading}>
                                {createLoading ? "Criando..." : "Criar Empresa"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data Criação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    Carregando...
                                </TableCell>
                            </TableRow>
                        ) : tenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    Nenhuma empresa encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tenants.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell className="font-medium">{tenant.name}</TableCell>
                                    <TableCell>{tenant.slug}</TableCell>
                                    <TableCell>
                                        <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                                            {tenant.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{format(new Date(tenant.created_at), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                                        >
                                            Ver Detalhes
                                        </Button>
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
