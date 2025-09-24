"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/dashboard/Filters";
import { KPIs } from "@/components/dashboard/KPIs";
import { Charts } from "@/components/dashboard/Charts";
import { DashboardTable } from "@/components/dashboard/Table";
import dayjs from "dayjs";

const URL_DASHBOARD_DATA = "https://webhook.bflabs.com.br/webhook/busca-dados-r7";

export const Dashboard = () => {
  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ instance: "all", tipo: "all", dateRange: null });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(URL_DASHBOARD_DATA);
      if (!response.ok) throw new Error("Erro ao carregar dados.");
      const result = await response.json();
      const data = Array.isArray(result) ? result.map((item: any) => ({
        ...item,
        date: dayjs(item.created_at),
      })) : [];
      data.sort((a: any, b: any) => b.date - a.date);
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

  const isDark = document.documentElement.classList.contains('dark');

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
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      {/* Premium Green Header */}
      <div className={`glass-card rounded-2xl p-6 mb-8 ${isDark ? '' : 'bg-green-50/50 border-green-200'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className={`w-20 h-1 bg-gradient-to-r from-[#10B981] to-[#059669] rounded-full mb-3 mx-auto sm:mx-0`}></div>
            <h1 className={`text-3xl font-bold ${isDark ? 'gradient-text' : 'text-gray-900'}`}>
              <i className={`fas fa-chart-bar mr-3 ${isDark ? 'text-green-400' : 'text-green-600'}`}></i>
              Dashboard Analytics & Insights
            </h1>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <i className={`fas fa-info-circle mr-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}></i>
              Monitore envios, performance e métricas em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button className={`btn-premium px-6 py-3 ${isDark ? 'gradient-primary' : 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50'}`}>
              <i className={`fas fa-download mr-2 ${isDark ? 'text-white' : 'text-green-600'}`}></i>
              Exportar Relatório
            </Button>
            <Button className={`btn-premium px-6 py-3 gradient-primary text-white`}>
              <i className="fas fa-sync-alt mr-2"></i>
              Atualizar Dados
            </Button>
          </div>
        </div>
      </div>

      <Filters onFilterChange={setFilters} />
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