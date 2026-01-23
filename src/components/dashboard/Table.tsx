"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Table as TableIcon, Inbox, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TableProps {
  data: any[];
}

export const DashboardTable = ({ data }: TableProps) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (item: any) => {
    const status = item.tipo_envio?.toLowerCase();

    if (status === 'sucesso' || status === 'sent') {
      return (
        <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 hover:bg-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Enviado
        </Badge>
      );
    }

    if (status === 'fila' || status === 'queued' || status === 'pending' || status === 'processing') {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20">
          <Inbox className="w-3 h-3 mr-1" />
          Fila
        </Badge>
      );
    }

    if (status === 'falha' || status === 'failed') {
      let errorText = item.error_message || "Erro desconhecido";

      // Try to parse JSON error if it looks like JSON
      if (errorText.startsWith('{') || errorText.startsWith('[')) {
        try {
          const parsed = JSON.parse(errorText);
          // Extract meaningful message if possible
          errorText = parsed.message || parsed.error || JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Keep original text if parse fails
        }
      }

      return (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger>
              <Badge variant="destructive" className="cursor-help hover:bg-red-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Falha
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px] break-words bg-red-950 text-white border-red-800">
              <p className="font-semibold mb-1">Detalhes do Erro:</p>
              <pre className="text-xs whitespace-pre-wrap font-mono">{errorText}</pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <span className="capitalize">{item.tipo_envio}</span>;
  };

  return (
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up mb-12">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
            <TableIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Registros de Disparo</h3>
        </div>

        {data.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-green-200/50 dark:border-green-500/30">
            <Table>
              <TableHeader className="bg-green-50/50 dark:bg-green-900/20">
                <TableRow className="border-b border-green-200/50 dark:border-green-500/20">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Instância</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Usou IA?</TableHead>
                  <TableHead>Respondeu?</TableHead>
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id || `${item.created_at}-${item.numero}`} className="border-b border-green-200/20 dark:border-green-500/10 hover:bg-green-500/10">
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300 border border-transparent hover:bg-green-200">
                        {item.instancia}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs" title={item.numero}>
                      {item.numero}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={item.nome_campanha}>
                      {item.nome_campanha || '-'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {(item.tipo_campanha || '').toLowerCase().includes('agendada') ? (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300 border border-transparent hover:bg-blue-200">
                          Agendada
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Pontual
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.usaria || item.usarIA ? (
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" /> Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 dark:text-gray-400">
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.responded_at ? (
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" /> Sim
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={item.texto}>
                      {item.texto?.substring(0, 60)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-lg">Nenhum registro encontrado</p>
            <p className="text-sm text-muted-foreground">Aplique filtros ou aguarde novos envios</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};