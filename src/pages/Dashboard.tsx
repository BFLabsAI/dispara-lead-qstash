"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/dashboard/Filters";
import { KPIs } from "@/components/dashboard/KPIs";
import { Charts } from "@/components/dashboard/Charts";
import { supabase } from "../services/supabaseClient";
import { getDashboardDataAll, getDashboardDataPaginated, getCampaignStats } from "../services/dashboardService";
import { PageHeader } from "@/components/layout/PageHeader";
import { RefreshCw } from "lucide-react";

import { useAdminStore } from "@/store/adminStore";

export const Dashboard = () => {
  const queryClient = useQueryClient();
  const impersonatedTenantId = useAdminStore((state) => state.impersonatedTenantId);
  const [filters, setFilters] = useState<any>({
    instance: "all",
    tipo: "all",
    campaign: "all",
    publico: "all",
    criativo: "all",
    dateRange: null
  });

  // React Query para buscar todos os dados com cache inteligente
  const {
    data: dashboardData,
    isLoading: loading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboardData', 'all', impersonatedTenantId],
    queryFn: () => getDashboardDataAll(),
    staleTime: 30000,
    gcTime: 300000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch Campaign Stats
  const { data: campaignStats } = useQuery({
    queryKey: ['campaignStats', impersonatedTenantId],
    queryFn: () => getCampaignStats(),
    staleTime: 30000,
  });

  const allData = dashboardData?.data || [];

  // Calculate Scheduled Metrics
  const scheduledCampaignsList = useMemo(() => {
    if (!campaignStats) return [];
    const now = new Date().toISOString();
    return campaignStats.filter((c: any) => c.status === 'pending' && c.scheduled_for && c.scheduled_for > now);
  }, [campaignStats]);

  const futureCampaignNames = useMemo(() => new Set(scheduledCampaignsList.map((c: any) => c.name)), [scheduledCampaignsList]);

  // Messages strictly belonging to future campaigns (Agendadas)
  const scheduledMessagesCount = scheduledCampaignsList.reduce((acc: number, curr: any) => acc + (curr.total_messages || 0), 0);

  // Apply filters to all data
  const filteredData = useMemo(() => {
    let filtered = [...allData];

    if (filters.instance !== "all") {
      filtered = filtered.filter(item => item.instancia === filters.instance);
    }
    if (filters.tipo !== "all") {
      filtered = filtered.filter(item => item.tipo_envio === filters.tipo);
    }
    if (filters.campaign !== "all") {
      filtered = filtered.filter(item => item.nome_campanha === filters.campaign);
    }
    if (filters.publico !== "all") {
      filtered = filtered.filter(item => item.publico === filters.publico);
    }
    if (filters.criativo !== "all") {
      filtered = filtered.filter(item => item.criativo === filters.criativo);
    }
    if (filters.dateRange?.from) {
      filtered = filtered.filter(item => item.date >= filters.dateRange.from);
    }
    if (filters.dateRange?.to) {
      filtered = filtered.filter(item => item.date <= filters.dateRange.to);
    }

    return filtered;
  }, [allData, filters]);

  // Generate filter options from all data (not filtered)
  const instanceOptions = useMemo(() => {
    const options = new Set<string>();
    allData.forEach(item => item.instancia && options.add(item.instancia));
    return ["all", ...Array.from(options).sort()];
  }, [allData]);

  const tipoOptions = useMemo(() => {
    const options = new Set<string>();
    allData.forEach(item => item.tipo_envio && options.add(item.tipo_envio));
    return ["all", ...Array.from(options).sort()];
  }, [allData]);

  const campaignOptions = useMemo(() => {
    const options = new Set<string>();
    allData.forEach(item => item.nome_campanha && options.add(item.nome_campanha));
    return ["all", ...Array.from(options).sort()];
  }, [allData]);

  const publicoOptions = useMemo(() => {
    const options = new Set<string>();
    allData.forEach(item => item.publico && options.add(item.publico));
    return ["all", ...Array.from(options).sort()];
  }, [allData]);

  const criativoOptions = useMemo(() => {
    const options = new Set<string>();
    allData.forEach(item => item.criativo && options.add(item.criativo));
    return ["all", ...Array.from(options).sort()];
  }, [allData]);

  // Combined loading state
  const isBusy = loading || isFetching;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500 mb-2" />
        <p className="text-muted-foreground">Buscando dados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-md">
        <AlertDescription>
          <p className="font-semibold">Erro ao carregar dados.</p>
          <p>{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
          <Button onClick={() => refetch()} className="mt-2">Tentar Novamente</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const totalQueued = filteredData.filter((d) => d.tipo_envio === 'fila').length;

  // Calculate Active Queue (Real Queue) = Total Queued (Logs) - Future Campaign Messages (Logs)
  // We filter logs to find messages that are Queued BUT NOT part of a Future Campaign
  const activeQueuedCount = filteredData.filter((d) =>
    d.tipo_envio === 'fila' && !futureCampaignNames.has(d.nome_campanha)
  ).length;

  // Use scheduledMessagesCount (from Stats) for 'Agendadas' as it is the plan size.
  // Use activeQueuedCount (from Logs) for 'Fila' as it represents actionable items now.

  // Total Envios should strictly be processed messages (Success + Failed), excluding Queue
  const totalEnvios = filteredData.length - totalQueued;
  const totalIA = filteredData.filter((d) => (d.usaria || d.usarIA) && d.tipo_envio !== 'fila').length;
  const totalSemIA = totalEnvios - totalIA;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Analytics e insights"
        extra={
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {allData.length > 0
                ? `${filteredData.length} de ${allData.length} registros`
                : 'Nenhum registro'
              }
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                import("../services/supabaseClient").then(({ clearAllCaches }) => {
                  clearAllCaches();
                  queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
                  queryClient.invalidateQueries({ queryKey: ['campaignStats'] });
                  refetch();
                });
              }}
              disabled={isBusy}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />
      <Filters
        onFilterChange={setFilters}
        instanceOptions={instanceOptions}
        tipoOptions={tipoOptions}
        campaignOptions={campaignOptions}
        publicoOptions={publicoOptions}
        criativoOptions={criativoOptions}
      />
      <KPIs
        totalEnvios={totalEnvios}
        totalIA={totalIA}
        totalSemIA={totalSemIA}
        agendadasCount={scheduledMessagesCount}
        filaCount={activeQueuedCount}
      />
      <Charts filteredData={filteredData} />
      <Charts filteredData={filteredData} />
    </div>
  );
};

export default Dashboard;