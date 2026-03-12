import { useMemo, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Building2, Loader2, MessageSquare, Server, Shield, Users } from "lucide-react";

type SummaryPayload = {
  generated_at: string;
  window_days: number;
  totals: {
    tenants: number;
    users: number;
    super_admins: number;
    instances: number;
    campaigns: number;
    logs: number;
  };
  tenants: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    active_last_window: number;
  };
  users: {
    total: number;
    super_admins: number;
    owners: number;
    admins: number;
    members: number;
    global_super_admins: number;
    invalid_profiles: number;
  };
  instances: {
    total: number;
    connected: number;
    disconnected: number;
  };
  campaigns: {
    total: number;
    draft: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  logs: {
    total: number;
    last_7d: number;
    last_30d: number;
  };
};

type TopTenant = {
  tenant_id: string;
  tenant_name: string;
  users_count: number;
  instances_count: number;
  campaigns_count: number;
  logs_in_window: number;
  last_log_at: string | null;
};

type SimpleTenantAlert = {
  id: string;
  name: string;
  status?: string | null;
};

type DisconnectedInstanceAlert = {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  instance_name: string;
  status: string | null;
  last_connected_at: string | null;
};

type StuckCampaignAlert = {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  name: string;
  status: string;
  created_at: string;
  scheduled_for: string | null;
};

type InvalidProfileAlert = {
  id: string;
  email: string | null;
  role: string | null;
  is_super_admin: boolean;
  created_at: string;
};

type AlertsPayload = {
  generated_at: string;
  window_days: number;
  tenants_without_owner: SimpleTenantAlert[];
  tenants_without_users: SimpleTenantAlert[];
  inactive_tenants: SimpleTenantAlert[];
  disconnected_instances: DisconnectedInstanceAlert[];
  stuck_campaigns: StuckCampaignAlert[];
  invalid_profiles: InvalidProfileAlert[];
};

const compactNumber = new Intl.NumberFormat("pt-BR");

const formatCount = (value: number | null | undefined) => compactNumber.format(value ?? 0);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const OverviewCard = ({
  title,
  value,
  description,
  icon: Icon,
  badge,
}: {
  title: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
      <div className="space-y-1">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{formatCount(value)}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const AlertListCard = ({
  title,
  description,
  items,
  renderItem,
}: {
  title: string;
  description: string;
  items: unknown[];
  renderItem: (item: any) => ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border p-3">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const summaryQuery = useQuery({
    queryKey: ["adminSummary", 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_summary", { window_days: 30 });
      if (error) throw error;
      return data as SummaryPayload;
    },
    staleTime: 30000,
  });

  const topTenantsQuery = useQuery({
    queryKey: ["adminTopTenants", 30, 5],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_top_tenants", {
        window_days: 30,
        result_limit: 5,
      });
      if (error) throw error;
      return (data || []) as TopTenant[];
    },
    staleTime: 30000,
  });

  const alertsQuery = useQuery({
    queryKey: ["adminAlerts", 30, 6],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_alerts", {
        window_days: 30,
        result_limit: 6,
      });
      if (error) throw error;
      return data as AlertsPayload;
    },
    staleTime: 30000,
  });

  const summary = summaryQuery.data;
  const topTenants = topTenantsQuery.data || [];
  const alerts = alertsQuery.data;

  const alertTotals = useMemo(() => {
    if (!alerts) return null;
    return (
      alerts.tenants_without_owner.length +
      alerts.tenants_without_users.length +
      alerts.inactive_tenants.length +
      alerts.disconnected_instances.length +
      alerts.stuck_campaigns.length +
      alerts.invalid_profiles.length
    );
  }, [alerts]);

  if (summaryQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Nao foi possivel carregar o dashboard administrativo.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Geral</h2>
        <p className="text-muted-foreground">
          Visao consolidada da plataforma com janela operacional de {summary.window_days} dias.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          title="Tenants"
          value={summary.totals.tenants}
          description={`${formatCount(summary.tenants.active)} ativas, ${formatCount(summary.tenants.suspended)} suspensas`}
          icon={Building2}
          badge={`${formatCount(summary.tenants.active_last_window)} com atividade`}
        />
        <OverviewCard
          title="Usuarios"
          value={summary.totals.users}
          description={`${formatCount(summary.users.owners)} owners, ${formatCount(summary.users.admins)} admins`}
          icon={Users}
          badge={`${formatCount(summary.users.super_admins)} super admins`}
        />
        <OverviewCard
          title="Instancias"
          value={summary.totals.instances}
          description={`${formatCount(summary.instances.connected)} conectadas, ${formatCount(summary.instances.disconnected)} desconectadas`}
          icon={Server}
        />
        <OverviewCard
          title="Mensagens"
          value={summary.totals.logs}
          description={`${formatCount(summary.logs.last_7d)} nos ultimos 7 dias`}
          icon={MessageSquare}
          badge={`${formatCount(summary.logs.last_30d)} em 30d`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saude de usuarios</CardTitle>
            <CardDescription>Distribuicao de perfis administrativos e operacionais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Super admins globais</span>
              <span className="font-medium">{formatCount(summary.users.global_super_admins)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Owners</span>
              <span className="font-medium">{formatCount(summary.users.owners)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Admins</span>
              <span className="font-medium">{formatCount(summary.users.admins)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Members</span>
              <span className="font-medium">{formatCount(summary.users.members)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <span>Perfis invalidos sem tenant</span>
              <span className="font-semibold">{formatCount(summary.users.invalid_profiles)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campanhas</CardTitle>
            <CardDescription>Pipeline de execucao da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-medium">{formatCount(summary.campaigns.draft)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium">{formatCount(summary.campaigns.pending)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Processing</span>
              <span className="font-medium">{formatCount(summary.campaigns.processing)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{formatCount(summary.campaigns.completed)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Failed</span>
              <span className="font-medium">{formatCount(summary.campaigns.failed)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas</CardTitle>
            <CardDescription>Itens que pedem acao ou triagem manual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsQuery.isLoading || !alerts || alertTotals === null ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <div className="text-2xl font-bold">{formatCount(alertTotals)}</div>
                    <p className="text-xs text-muted-foreground">soma dos alertas destacados abaixo</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-muted-foreground">Sem owner</div>
                    <div className="text-xl font-semibold">{formatCount(alerts.tenants_without_owner.length)}</div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-muted-foreground">Instancias off</div>
                    <div className="text-xl font-semibold">{formatCount(alerts.disconnected_instances.length)}</div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-muted-foreground">Campanhas presas</div>
                    <div className="text-xl font-semibold">{formatCount(alerts.stuck_campaigns.length)}</div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-muted-foreground">Perfis invalidos</div>
                    <div className="text-xl font-semibold">{formatCount(alerts.invalid_profiles.length)}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top tenants por volume</CardTitle>
          <CardDescription>Ranking por mensagens nos ultimos 30 dias, com contexto operacional.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Instancias</TableHead>
                <TableHead>Campanhas</TableHead>
                <TableHead>Mensagens 30d</TableHead>
                <TableHead>Ultima atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topTenantsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : topTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum tenant com atividade recente.
                  </TableCell>
                </TableRow>
              ) : (
                topTenants.map((tenant) => (
                  <TableRow key={tenant.tenant_id}>
                    <TableCell className="font-medium">{tenant.tenant_name}</TableCell>
                    <TableCell>{formatCount(tenant.users_count)}</TableCell>
                    <TableCell>{formatCount(tenant.instances_count)}</TableCell>
                    <TableCell>{formatCount(tenant.campaigns_count)}</TableCell>
                    <TableCell>{formatCount(tenant.logs_in_window)}</TableCell>
                    <TableCell>{formatDate(tenant.last_log_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {alertsQuery.isLoading || !alerts ? (
          <>
            <Card><CardContent className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
            <Card><CardContent className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
            <Card><CardContent className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
            <Card><CardContent className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          </>
        ) : (
          <>
            <AlertListCard
              title="Tenants sem owner"
              description="Empresas sem usuario com papel owner."
              items={alerts.tenants_without_owner}
              renderItem={(item: SimpleTenantAlert) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.id}</p>
                  </div>
                  <Badge variant="outline">{item.status || "sem status"}</Badge>
                </div>
              )}
            />

            <AlertListCard
              title="Tenants inativos"
              description={`Sem mensagens na janela de ${alerts.window_days} dias.`}
              items={alerts.inactive_tenants}
              renderItem={(item: SimpleTenantAlert) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.id}</p>
                  </div>
                  <Badge variant="secondary">{item.status || "sem status"}</Badge>
                </div>
              )}
            />

            <AlertListCard
              title="Instancias desconectadas"
              description="Instancias com status diferente de connected."
              items={alerts.disconnected_instances}
              renderItem={(item: DisconnectedInstanceAlert) => (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.instance_name}</p>
                    <Badge variant="destructive">{item.status || "unknown"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.tenant_name || "Sem tenant"} · ultima conexao {formatDate(item.last_connected_at)}
                  </p>
                </div>
              )}
            />

            <AlertListCard
              title="Campanhas presas"
              description="Campanhas em pending ou processing."
              items={alerts.stuck_campaigns}
              renderItem={(item: StuckCampaignAlert) => (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.name}</p>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.tenant_name || "Sem tenant"} · criada em {formatDate(item.created_at)}
                  </p>
                </div>
              )}
            />

            <AlertListCard
              title="Perfis invalidos"
              description="Usuarios sem tenant que nao sao super admin."
              items={alerts.invalid_profiles}
              renderItem={(item: InvalidProfileAlert) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.email || item.id}</p>
                    <p className="text-xs text-muted-foreground">
                      role {item.role || "null"} · criado em {formatDate(item.created_at)}
                    </p>
                  </div>
                  <Badge variant="destructive">invalido</Badge>
                </div>
              )}
            />

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Leitura administrativa
                </CardTitle>
                <CardDescription>
                  O painel agora usa RPCs agregadas para reduzir roundtrips e centralizar a regra administrativa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Resumo consolidado via `admin_dashboard_summary()`.</p>
                <p>Ranking via `admin_dashboard_top_tenants()`.</p>
                <p>Alertas operacionais via `admin_dashboard_alerts()`.</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
