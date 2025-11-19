import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSubmitted(true);
            toast({
                title: "Email enviado",
                description: "Verifique sua caixa de entrada para redefinir sua senha.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao enviar email",
                description: error.message || "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">Verifique seu email</CardTitle>
                        <CardDescription className="text-center">
                            Enviamos um link de recuperação para <strong>{email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button variant="link" onClick={() => navigate('/login')}>
                            Voltar para o Login
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Recuperar Senha</CardTitle>
                    <CardDescription className="text-center">
                        Digite seu email para receber o link de recuperação
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleReset} className="space-y-4">
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
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Link'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link to="/login" className="text-sm text-muted-foreground hover:underline">
                        Voltar para o Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
