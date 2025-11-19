import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/services/supabaseClient";
import { Users, Server, MessageSquare } from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        tenants: 0,
        instances: 0,
        users: 0
    });

    useEffect(() => {
        const loadStats = async () => {
            const { count: tenantsCount } = await supabase
                .from('tenants_dispara_lead_saas')
                .select('*', { count: 'exact', head: true });

            const { count: instancesCount } = await supabase
                .from('instances_dispara_lead_saas')
                .select('*', { count: 'exact', head: true });

            const { count: usersCount } = await supabase
                .from('users_dispara_lead_saas')
                .select('*', { count: 'exact', head: true });

            setStats({
                tenants: tenantsCount || 0,
                instances: instancesCount || 0,
                users: usersCount || 0
            });
        };

        loadStats();
    }, []);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Geral</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.tenants}</div>
                        <p className="text-xs text-muted-foreground">Empresas registradas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Instâncias Conectadas</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.instances}</div>
                        <p className="text-xs text-muted-foreground">Total de instâncias Evolution</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users}</div>
                        <p className="text-xs text-muted-foreground">Usuários na plataforma</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
