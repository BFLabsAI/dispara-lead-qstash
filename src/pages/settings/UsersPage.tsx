import { useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Shield, User as UserIcon, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminStore } from '@/store/adminStore';

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: 'owner' | 'admin' | 'user';
    created_at: string;
}

export default function UsersPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('admin');

    const impersonatedTenantId = useAdminStore((state) => state.impersonatedTenantId);

    // 1. Fetch Current User Data
    const { data: currentUserData, isLoading: isLoadingUserData } = useQuery({
        queryKey: ['currentUserData'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from('users_dispara_lead_saas_02')
                .select('role, tenant_id')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return data;
        }
    });

    const currentUserRole = currentUserData?.role || 'user';
    // Effective Tenant: Impersonated (if super admin switched) OR User's own tenant
    const currentTenantId = impersonatedTenantId || currentUserData?.tenant_id;

    // 2. Fetch Workspace Users
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['workspaceUsers', currentTenantId],
        queryFn: async () => {
            if (!currentTenantId) return [];

            const { data, error } = await supabase
                .from('users_dispara_lead_saas_02')
                .select('*')
                .eq('tenant_id', currentTenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as UserProfile[];
        },
        enabled: !!currentTenantId
    });

    // 3. Invite User Mutation
    const inviteMutation = useMutation({
        mutationFn: async (payload: { email: string, name: string, role: string }) => {
            if (!currentTenantId) throw new Error("Tenant ID not found");

            const { data, error } = await supabase.functions.invoke('auth_manager_dispara_lead', {
                body: {
                    action: 'invite',
                    email: payload.email,
                    name: payload.name,
                    role: payload.role,
                    tenant_id: currentTenantId,
                    redirectTo: `${window.location.origin}/finish-profile`
                }
            });

            if (error) {
                // Parse error body if possible
                throw error;
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            return data;
        },
        onSuccess: () => {
            toast({ title: "Convite enviado!", description: "O usuário receberá um email com instruções." });
            setIsInviteOpen(false);
            setInviteEmail('');
            setInviteName('');
            setInviteRole('admin');
            queryClient.invalidateQueries({ queryKey: ['workspaceUsers'] });
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Erro ao convidar",
                description: error.message
            });
        }
    });

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        inviteMutation.mutate({ email: inviteEmail, name: inviteName, role: inviteRole });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner': return <Badge className="bg-purple-500 hover:bg-purple-600">Dono</Badge>;
            case 'admin': return <Badge variant="default">Admin</Badge>;
            default: return <Badge variant="secondary">Usuário</Badge>;
        }
    };

    if (isLoadingUserData) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Acesso Restrito</h2>
                <p>Apenas administradores podem gerenciar a equipe.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Equipe</h1>
                    <p className="text-muted-foreground">Convide membros e gerencie acessos.</p>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="btn-premium">
                            <Plus className="mr-2 h-4 w-4" /> Convidar Membro
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Convidar novo membro</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={inviteName}
                                    onChange={e => setInviteName(e.target.value)}
                                    placeholder="Ex: João da Silva"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Corporativo</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder="joao@empresa.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Função</Label>
                                <Select value={inviteRole} onValueChange={(v: 'admin' | 'user') => setInviteRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a função" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="user">Usuário</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={inviteMutation.isPending}>
                                    {inviteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                    Enviar Convite
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Membros ({users?.length || 0})</CardTitle>
                    <CardDescription>Lista de usuários com acesso ao workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Entrou em</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : users?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <UserIcon className="h-4 w-4 text-primary" />
                                        </div>
                                        {user.full_name || 'Sem nome'}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        {user.role !== 'owner' && (
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
