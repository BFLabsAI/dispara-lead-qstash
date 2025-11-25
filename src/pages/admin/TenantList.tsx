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
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tenants_dispara_lead_saas_02')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading tenants:", error);
        } else {
            setTenants(data || []);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Gerenciar Empresas</h2>
                <Button>Nova Empresa</Button>
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
