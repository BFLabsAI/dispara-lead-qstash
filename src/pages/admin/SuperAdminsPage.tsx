import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeAuthenticatedEdgeFunction, supabase } from '@/services/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Shield } from 'lucide-react';

interface SuperAdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  tenant_id: string | null;
  created_at: string;
  is_super_admin: boolean;
}

export default function SuperAdminsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const { data: superAdmins = [], isLoading } = useQuery({
    queryKey: ['superAdmins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_dispara_lead_saas_02')
        .select('id, email, full_name, role, tenant_id, created_at, is_super_admin')
        .eq('is_super_admin', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SuperAdminProfile[];
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const data = await invokeAuthenticatedEdgeFunction<{ error?: string }>(
        'auth_manager_dispara_lead',
        {
          action: 'invite',
          email: inviteEmail,
          name: inviteName,
          role: 'admin',
          is_super_admin: true,
          redirectTo: `${window.location.origin}/finish-profile`
        }
      );
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Convite enviado',
        description: 'O super admin receberá um email para criar a conta.'
      });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      queryClient.invalidateQueries({ queryKey: ['superAdmins'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao convidar super admin',
        description: error.message
      });
    }
  });

  const handleInvite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admins</h2>
          <p className="text-muted-foreground">
            Convide administradores globais que operam o Manager Portal sem vínculo obrigatório com tenant.
          </p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Convidar Super Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Super Admin</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="super-admin-name">Nome</Label>
                <Input
                  id="super-admin-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Bruno Falcão"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="super-admin-email">Email</Label>
                <Input
                  id="super-admin-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar Convite
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acessos globais</CardTitle>
          <CardDescription>
            Esses usuários acessam o portal administrativo e depois escolhem tenants via impersonation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Tenant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : superAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum super admin cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                superAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.full_name || '-'}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge className="gap-1">
                        <Shield className="h-3 w-3" />
                        Super Admin
                      </Badge>
                    </TableCell>
                    <TableCell>{admin.tenant_id || 'Sem tenant'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
