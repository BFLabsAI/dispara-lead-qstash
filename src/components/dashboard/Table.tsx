"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Table as TableIcon, Inbox } from "lucide-react";

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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Modo de Disparo</TableHead>
                  <TableHead>Usou IA?</TableHead>
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
                    <TableCell className="max-w-xs truncate" title={item.numero}>
                      {item.numero}
                    </TableCell>
                    <TableCell className="capitalize">{item.tipo_envio}</TableCell>
                    <TableCell className="capitalize">
                      {(item.tipo_campanha || '').toLowerCase().includes('agendada') ? (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300 border border-transparent hover:bg-blue-200">
                          Agendada
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
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
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" /> Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-lg truncate" title={item.texto}>
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