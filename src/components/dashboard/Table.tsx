"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Table as TableIcon, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

interface TableProps {
  data: any[];
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

export const DashboardTable = ({ data, currentPage, totalPages, onPageChange }: TableProps) => {
  const itemsPerPage = 5;
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up mb-12">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
            <TableIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Registros de Disparo</h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-green-200/50 dark:border-green-500/30">
          <Table>
            <TableHeader className="bg-green-50/50 dark:bg-green-900/20">
              <TableRow className="border-b border-green-200/50 dark:border-green-500/20">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Instância</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Usou IA?</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index} className="border-b border-green-200/20 dark:border-green-500/10 hover:bg-green-500/10">
                  <TableCell>{item.date.format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300 border border-transparent hover:bg-green-200">
                      {item.instancia}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={item.numero}>
                    {item.numero}
                  </TableCell>
                  <TableCell className="capitalize">{item.tipo_envio}</TableCell>
                  <TableCell>
                    {item.usaria ? (
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
        {data.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-lg">Nenhum registro encontrado</p>
            <p className="text-sm text-muted-foreground">Aplique filtros ou aguarde novos envios</p>
          </div>
        ) : (
          <div className="flex justify-center items-center space-x-4 mt-8 pt-6 border-t border-green-200/50 dark:border-green-500/30">
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span>Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};