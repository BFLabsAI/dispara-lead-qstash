import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Erro ao criar usuário.");

            // 2. Create Tenant (Company)
            // Note: Ideally this should be done via a Postgres Trigger on auth.users insert
            // or an Edge Function to ensure atomicity.
            // For now, we'll do it client-side but RLS might block us if we don't have a policy allowing new users to create tenants.
            // We need a policy on 'tenants_dispara_lead_saas_02' allowing INSERT for authenticated users.
            // And a policy on 'users_dispara_lead_saas_02' allowing INSERT.

            // Let's assume we have a trigger or we call an RPC.
            // If not, we might fail here if RLS is strict.
            // Let's try to insert directly.

            // Create Tenant
            const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

            // We need to fetch a default plan first
            const { data: plan } = await supabase.from('plans_dispara_lead_saas_02').select('id').eq('slug', 'basic').single();

            if (!plan) throw new Error("Plano padrão não encontrado.");

            const { data: tenant, error: tenantError } = await supabase
                .from('tenants_dispara_lead_saas_02')
                .insert({
                    name: companyName,
                    slug: slug,
                    plan_id: plan.id,
                    owner_id: authData.user.id,
                    status: 'active'
                })
                .select()
                .single();

            if (tenantError) throw tenantError;

            // 3. Create User Profile linked to Tenant
            const { error: profileError } = await supabase
                .from('users_dispara_lead_saas_02')
                .insert({
                    id: authData.user.id,
                    tenant_id: tenant.id,
                    role: 'owner',
                    email: email,
                    full_name: companyName // Use company name as initial name or ask for it
                });

            if (profileError) throw profileError;

            toast({
                title: "Conta criada com sucesso!",
                description: "Você já pode acessar o sistema.",
            });

            navigate('/dashboard');
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro ao cadastrar",
                description: error.message || "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Crie sua conta</CardTitle>
                    <CardDescription className="text-center">
                        Comece a usar o DisparaLead SaaS hoje mesmo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nome da Empresa</Label>
                            <Input
                                id="companyName"
                                placeholder="Sua Empresa"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Criando conta...' : 'Cadastrar'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-primary hover:underline">
                            Entrar
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
