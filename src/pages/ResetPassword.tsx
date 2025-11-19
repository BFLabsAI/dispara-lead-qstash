import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // Check if we have a session (Supabase handles the hash fragment automatically)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast({
                    variant: "destructive",
                    title: "Link inválido ou expirado",
                    description: "Por favor, solicite um novo link de recuperação.",
                });
                navigate('/forgot-password');
            }
        });
    }, [navigate, toast]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast({
                title: "Senha atualizada",
                description: "Sua senha foi alterada com sucesso. Você já está logado.",
            });
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar senha",
                description: error.message || "Tente novamente.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Nova Senha</CardTitle>
                    <CardDescription className="text-center">
                        Digite sua nova senha abaixo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nova Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Atualizando...' : 'Atualizar Senha'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
