"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/dashboard/Filters";
import { KPIs } from "@/components/dashboard/KPIs";
import { Charts } from "@/components/dashboard/Charts";
import { DashboardTable } from "@/components/dashboard/Table";
import { supabase } from "../services/supabaseClient";
import { getDashboardDataAll, getDashboardDataPaginated } from "../services/dashboardService";
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
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboardData', 'all', impersonatedTenantId],
    queryFn: () => getDashboardDataAll(),
    staleTime: 30000, // 30 segundos - considera dados frescos
    gcTime: 300000, // 5 minutos - mantém no cache (renamed from cacheTime in v5)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  const allData = dashboardData?.data || [];

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

  const totalEnvios = filteredData.length;
  const totalIA = filteredData.filter((d) => d.usaria || d.usarIA).length;
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
              onClick={() => refetch()}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
      <KPIs totalEnvios={totalEnvios} totalIA={totalIA} totalSemIA={totalSemIA} />
      <Charts filteredData={filteredData} />
      <DashboardTable data={filteredData} />
    </div>
  );
};

export default Dashboard;