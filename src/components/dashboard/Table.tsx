"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import dayjs from "dayjs";

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
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up mb-12 section-mb">
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <i className="fas fa-table text-green-400 text-xl"></i>
          <h5 className="font-bold text-xl gradient-text">Registros de Disparo</h5>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader className="bg-black/20 backdrop-blur-sm">
              <TableRow className="border-b border-white/10">
                <TableHead className="text-white font-semibold py-4 text-left">Data/Hora</TableHead>
                <TableHead className="text-white font-semibold py-4 text-left">Instância</TableHead>
                <TableHead className="text-white font-semibold py-4 text-left">Número</TableHead>
                <TableHead className="text-white font-semibold py-4 text-left">Tipo</TableHead>
                <TableHead className="text-white font-semibold py-4 text-left">Usou IA?</TableHead>
                <TableHead className="text-white font-semibold py-4 text-left">Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index} className={`border-b border-white/5 hover:bg-green-500/5 transition-colors ${index % 2 === 0 ? 'bg-black/5' : ''}`}>
                  <TableCell className="text-white py-4 font-medium">{item.date.format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell className="py-4">
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 font-medium">{item.instancia}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 py-4 max-w-xs truncate" title={item.numero}>
                    {item.numero}
                  </TableCell>
                  <TableCell className="text-gray-300 py-4 capitalize">{item.tipo_envio}</TableCell>
                  <TableCell className={`py-4 font-medium ${item.usaria ? "text-green-400" : "text-red-400"}`}>
                    {item.usaria ? <><CheckCircle className="h-4 w-4 inline mr-1" /> Sim</> : <><XCircle className="h-4 w-4 inline mr-1" /> Não</>}
                  </TableCell>
                  <TableCell className="text-gray-400 py-4 max-w-lg" title={item.texto}>
                    <span className="truncate block">{item.texto?.substring(0, 60)}...</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-inbox text-4xl mb-4 text-gray-500"></i>
            <p className="text-lg">Nenhum registro encontrado</p>
            <p className="text-sm mt-1">Aplique filtros ou aguarde novos envios</p>
          </div>
        ) : (
          <div className="flex justify-center items-center space-x-4 mt-8 pt-6 border-t border-white/10">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className="glass-card border-white/20 text-white hover:bg-green-500/20"
            >
              <i className="fas fa-chevron-left mr-2"></i> Anterior
            </Button>
            <span className="text-gray-300 font-medium">Página {currentPage} de {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className="glass-card border-white/20 text-white hover:bg-green-500/20"
            >
              Próxima <i className="fas fa-chevron-right mr-2"></i>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};