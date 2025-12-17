import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/services/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    features: string[] | Record<string, string | number | boolean> | null;
    limits: {
        agent_messages_limit?: number;
        messages_limit?: number;
        instances_limit?: number;
        instances?: number;
    };
}

export default function PlansList() {
    const { toast } = useToast();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        features: "",
        limits: ""
    });

    const loadPlans = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('plans_dispara_lead_saas_02')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar planos",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const handleSave = async () => {
        try {
            const price = parseFloat(formData.price);
            // Generate simple slug from name: "My Plan" -> "my-plan"
            const generatedSlug = formData.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

            const payload = {
                name: formData.name,
                description: formData.description,
                price: isNaN(price) ? 0 : price,
                slug: generatedSlug,
                features: formData.features ? JSON.parse(formData.features) : {},
                limits: formData.limits ? JSON.parse(formData.limits) : {}
            };

            let error;
            if (editingPlan) {
                const { error: updateError } = await supabase
                    .from('plans_dispara_lead_saas_02')
                    .update(payload)
                    .eq('id', editingPlan.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('plans_dispara_lead_saas_02')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: editingPlan ? "Plano atualizado" : "Plano criado",
                description: "As alterações foram salvas com sucesso."
            });

            setIsModalOpen(false);
            setEditingPlan(null);
            setFormData({ name: "", description: "", price: "", features: "", limits: "" });
            loadPlans();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar plano",
                description: error.message
            });
        }
    };

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            description: plan.description || "",
            price: plan.price.toString(),
            features: JSON.stringify(plan.features, null, 2),
            limits: JSON.stringify(plan.limits, null, 2)
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este plano?")) return;

        try {
            const { error } = await supabase
                .from('plans_dispara_lead_saas_02')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Plano excluído",
                description: "O plano foi removido com sucesso."
            });
            loadPlans();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir plano",
                description: error.message
            });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Planos de Assinatura</h2>
                <Button onClick={() => {
                    setEditingPlan(null);
                    setFormData({ name: "", description: "", price: "", features: "{}", limits: "{}" });
                    setIsModalOpen(true);
                }}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Plano
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Planos Disponíveis</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Features</TableHead>
                                <TableHead>Limites</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium">{plan.name}</TableCell>
                                    <TableCell>R$ {plan.price.toFixed(2)}</TableCell>
                                    <TableCell>{plan.description}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.isArray(plan.features) ? (
                                                plan.features.map((feature: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                        {feature}
                                                    </Badge>
                                                ))
                                            ) : typeof plan.features === 'object' && plan.features !== null ? (
                                                Object.entries(plan.features).map(([key, value], i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                        {key}: {String(value)}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-sm">
                                            {plan.limits && (
                                                <>
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-muted-foreground">Msgs Agente:</span>
                                                        <span className="font-medium">
                                                            {plan.limits.agent_messages_limit || plan.limits.messages_limit || '∞'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-muted-foreground">Instâncias:</span>
                                                        <span className="font-medium">
                                                            {plan.limits.instances_limit || plan.limits.instances || 1}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(plan.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {plans.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        Nenhum plano cadastrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nome</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Preço</Label>
                            <Input id="price" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Descrição</Label>
                            <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="col-span-3" />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">Limites</Label>
                        <div className="col-span-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="agent_limit" className="text-xs text-muted-foreground">Msgs Agente</Label>
                                    <Input
                                        id="agent_limit"
                                        type="number"
                                        value={JSON.parse(formData.limits || '{}').agent_messages_limit || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const currentLimits = JSON.parse(formData.limits || '{}');
                                            const newLimits = { ...currentLimits, agent_messages_limit: isNaN(val) ? 0 : val };
                                            setFormData({ ...formData, limits: JSON.stringify(newLimits) });
                                        }}
                                        placeholder="Ex: 1000"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="instances_limit" className="text-xs text-muted-foreground">Instâncias</Label>
                                    <Input
                                        id="instances_limit"
                                        type="number"
                                        value={JSON.parse(formData.limits || '{}').instances_limit || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const currentLimits = JSON.parse(formData.limits || '{}');
                                            const newLimits = { ...currentLimits, instances_limit: isNaN(val) ? 0 : val };
                                            setFormData({ ...formData, limits: JSON.stringify(newLimits) });
                                        }}
                                        placeholder="Ex: 1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSave}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
