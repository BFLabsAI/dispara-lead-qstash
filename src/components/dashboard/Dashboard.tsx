"use client";

import { useState, useEffect } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Filters } from "./Filters";
import { KPIs } from "./KPIs";
import { Charts } from "./Charts";
import { DashboardTable } from "./Table";
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 glass-card rounded-3xl p-12 animate-scale-in mx-auto max-w-4xl">
        <div className="loading-dots mb-6">
          <div></div><div></div><div></div><div></div>
        </div>
        <h3 className="text-2xl font-semibold mb-2 gradient-text">Carregando Dashboard</h3>
        <p className="text-gray-400">Buscando dados analíticos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center animate-scale-in mx-auto max-w-4xl">
        <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <AlertDescription className="text-gray-300">
          <p className="font-semibold text-white mb-2">Erro ao carregar dados.</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={loadData} className="btn-premium px-6 py-3 gradient-primary text-white rounded-xl">
            <i className="fas fa-redo mr-2"></i>
            Tentar Novamente
          </Button>
        </AlertDescription>
      </div>
    );
  }

  const totalEnvios = filteredData.length;
  const totalIA = filteredData.filter((d) => d.usaria).length;
  const totalSemIA = totalEnvios - totalIA;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4"> {/* Added max-width and px-4 for spacing */}
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