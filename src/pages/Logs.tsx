import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/dashboard/Filters";
import { DashboardTable } from "@/components/dashboard/Table";
import { getDashboardDataPaginated, getDashboardPreviewData } from "../services/dashboardService";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAdminStore } from "@/store/adminStore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const DEFAULT_LOG_WINDOW_DAYS = 7;

const Logs = () => {
    const impersonatedTenantId = useAdminStore((state) => state.impersonatedTenantId);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;
    const [filters, setFilters] = useState<any>({
        instance: "all",
        tipo: "all",
        campaign: "all",
        publico: "all",
        criativo: "all",
        responseStatus: "all",
        dateRange: null
    });
    const hasExplicitDateRange = Boolean(filters.dateRange?.from || filters.dateRange?.to);

    const effectiveDateRange = useMemo(() => {
        if (filters.dateRange?.from || filters.dateRange?.to) {
            return {
                from: filters.dateRange?.from ? dayjs(filters.dateRange.from).startOf('day') : null,
                to: filters.dateRange?.to
                    ? dayjs(filters.dateRange.to).endOf('day')
                    : filters.dateRange?.from
                        ? dayjs(filters.dateRange.from).endOf('day')
                        : null,
            };
        }

        return {
            from: dayjs().subtract(DEFAULT_LOG_WINDOW_DAYS - 1, 'day').startOf('day'),
            to: dayjs().endOf('day'),
        };
    }, [filters.dateRange]);

    const {
        data: filterPreviewData,
    } = useQuery({
        queryKey: [
            'logsFilterPreview',
            impersonatedTenantId,
            hasExplicitDateRange ? effectiveDateRange.from?.toISOString() : 'default-7d',
            hasExplicitDateRange ? effectiveDateRange.to?.toISOString() : null,
        ],
        queryFn: () => getDashboardPreviewData(500),
        staleTime: 30000,
        gcTime: 300000,
        retry: 2,
    });

    const normalizedFilters = useMemo(() => ({
        instance: filters.instance !== "all" ? filters.instance : undefined,
        tipo: filters.tipo !== "all" ? filters.tipo : undefined,
        campaign: filters.campaign !== "all" ? filters.campaign : undefined,
        publico: filters.publico !== "all" ? filters.publico : undefined,
        criativo: filters.criativo !== "all" ? filters.criativo : undefined,
        responseStatus: filters.responseStatus !== "all" ? filters.responseStatus : undefined,
        dateStart: effectiveDateRange.from?.toISOString(),
        dateEnd: effectiveDateRange.to?.toISOString(),
    }), [filters, effectiveDateRange]);

    const {
        data: paginatedData,
        isLoading: loading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['logsData', currentPage, pageSize, impersonatedTenantId, normalizedFilters],
        queryFn: () => getDashboardDataPaginated(currentPage, pageSize, normalizedFilters),
        staleTime: 30000,
        gcTime: 300000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
    const currentData = paginatedData?.data || [];
    const totalCount = paginatedData?.count || 0;
    const totalPages = paginatedData?.totalPages || 1;
    const previewData = filterPreviewData || [];

    const isBusy = loading || isFetching;

    // Generate filter options from a recent preview sample to keep the filters usable without loading all rows.
    const instanceOptions = useMemo(() => {
        const options = new Set<string>();
        previewData.forEach(item => item.instancia && options.add(item.instancia));
        return ["all", ...Array.from(options).sort()];
    }, [previewData]);

    const tipoOptions = useMemo(() => {
        const options = new Set<string>();
        previewData.forEach(item => item.tipo_envio && options.add(item.tipo_envio));
        return ["all", ...Array.from(options).sort()];
    }, [previewData]);

    const campaignOptions = useMemo(() => {
        const options = new Set<string>();
        previewData.forEach(item => item.nome_campanha && options.add(item.nome_campanha));
        return ["all", ...Array.from(options).sort()];
    }, [previewData]);

    const publicoOptions = useMemo(() => {
        const options = new Set<string>();
        previewData.forEach(item => item.publico && options.add(item.publico));
        return ["all", ...Array.from(options).sort()];
    }, [previewData]);

    const criativoOptions = useMemo(() => {
        const options = new Set<string>();
        previewData.forEach(item => item.criativo && options.add(item.criativo));
        return ["all", ...Array.from(options).sort()];
    }, [previewData]);

    const handleFilterChange = (nextFilters: any) => {
        setFilters(nextFilters);
        setCurrentPage(1);
    };

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

    return (
        <div>
            <PageHeader
                title="Logs de Disparo"
                subtitle={hasExplicitDateRange ? "Histórico detalhado do período selecionado" : "Histórico detalhado dos últimos 7 dias"}
                extra={
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            {totalCount > 0
                                ? `${currentData.length} de ${totalCount} registros`
                                : 'Nenhum registro'
                            }
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
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
                onFilterChange={handleFilterChange}
                instanceOptions={instanceOptions}
                tipoOptions={tipoOptions}
                campaignOptions={campaignOptions}
                publicoOptions={publicoOptions}
                criativoOptions={criativoOptions}
            />
            <DashboardTable data={currentData} />

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4 mb-8">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1 || isBusy}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Anterior
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages || isBusy}
                    >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Logs;
