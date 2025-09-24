"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div>
      {/* Green Gradient Header */}
      <div className={`w-full py-4 px-6 flex items-center justify-between ${isDark ? 'glass-card bg-black/20' : 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg'}`}>
        <div className="flex items-center gap-3">
          <BarChart3 className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-white'}`} />
          <h1 className={`text-2xl font-bold ${isDark ? 'gradient-text' : 'text-white drop-shadow-md'}`}>Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-white/80'}`}>Análises em tempo real</p>
          <Badge variant="destructive" className="flex items-center gap-1">
            3
            <i className="fas fa-bell text-xs"></i>
          </Badge>
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