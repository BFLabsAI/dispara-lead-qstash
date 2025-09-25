"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/dashboard/Filters";
import { KPIs } from "@/components/dashboard/KPIs";
import { Charts } from "@/components/dashboard/Charts";
import { DashboardTable } from "@/components/dashboard/Table";
import dayjs from "dayjs";
import { getDashboardData } from "../services/dashboardService";
import { PageHeader } from "@/components/layout/PageHeader";

export const Dashboard = () => {
  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<any>({ 
    instance: "all", 
    tipo: "all", 
    campaign: "all", // Novo filtro
    publico: "all", // Novo filtro
    criativo: "all", // Novo filtro
    dateRange: null 
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDashboardData();
      setAllData(data);
      setFilteredData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...allData];
    if (filters.instance !== "all") {
      filtered = filtered.filter((item) => item.instancia === filters.instance);
    }
    if (filters.tipo !== "all") {
      filtered = filtered.filter((item) => item.tipo_envio === filters.tipo);
    }
    if (filters.campaign !== "all") { // Nova lógica de filtro
      filtered = filtered.filter((item) => item.nome_campanha === filters.campaign);
    }
    if (filters.publico !== "all") { // Nova lógica de filtro
      filtered = filtered.filter((item) => item.publico === filters.publico);
    }
    if (filters.criativo !== "all") { // Nova lógica de filtro
      filtered = filtered.filter((item) => item.criativo === filters.criativo);
    }
    if (filters.dateRange?.from && filters.dateRange?.to) {
      const start = dayjs(filters.dateRange.from).startOf("day");
      const end = dayjs(filters.dateRange.to).endOf("day");
      filtered = filtered.filter((item) =>
        item.date.isAfter(start) && item.date.isBefore(end)
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [allData, filters]);

  const totalPages = Math.ceil(filteredData.length / 5);

  const instanceOptions = useMemo(() => {
    const options = new Set<string>();
    allData.forEach(item => item.instancia && options.add(item.instancia));
    return ["all", ...Array.from(options)];
  }, [allData]);

  const tipoOptions = useMemo(() => {
    const options = new Set<string>();
    allData.forEach(item => item.tipo_envio && options.add(item.tipo_envio));
    return ["all", ...Array.from(options)];
  }, [allData]);

  const campaignOptions = useMemo(() => { // Novas opções de filtro
    const options = new Set<string>();
    allData.forEach(item => item.nome_campanha && options.add(item.nome_campanha));
    return ["all", ...Array.from(options)];
  }, [allData]);

  const publicoOptions = useMemo(() => { // Novas opções de filtro
    const options = new Set<string>();
    allData.forEach(item => item.publico && options.add(item.publico));
    return ["all", ...Array.from(options)];
  }, [allData]);

  const criativoOptions = useMemo(() => { // Novas opções de filtro
    const options = new Set<string>();
    allData.forEach(item => item.criativo && options.add(item.criativo));
    return ["all", ...Array.from(options)];
  }, [allData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500 mb-2" />
        <p className="text-muted-foreground">Buscando dados do dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-md">
        <AlertDescription>
          <p className="font-semibold">Erro ao carregar dados.</p>
          <p>{error}</p>
          <Button onClick={loadData} className="mt-2">Tentar Novamente</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const totalEnvios = filteredData.length;
  const totalIA = filteredData.filter((d) => d.usaria).length;
  const totalSemIA = totalEnvios - totalIA;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Analytics e insights em tempo real" />
      <Filters 
        onFilterChange={setFilters} 
        instanceOptions={instanceOptions}
        tipoOptions={tipoOptions}
        campaignOptions={campaignOptions} // Passando novas opções
        publicoOptions={publicoOptions}   // Passando novas opções
        criativoOptions={criativoOptions} // Passando novas opções
      />
      <KPIs totalEnvios={totalEnvios} totalIA={totalIA} totalSemIA={totalSemIA} />
      <Charts filteredData={filteredData} />
      <DashboardTable
        data={filteredData}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default Dashboard;