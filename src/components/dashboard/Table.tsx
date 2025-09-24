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
  const isDark = document.documentElement.classList.contains('dark');
  const itemsPerPage = 5;
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up mb-12 section-mb">
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <i className={`fas fa-table text-xl text-green-600`}></i>
          <h5 className={`font-bold text-xl ${isDark ? 'gradient-text' : 'text-gray-900'}`}>Registros de Disparo</h5>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table>
            <TableHeader className={`table-header ${isDark ? 'bg-black/20 backdrop-blur-sm' : 'bg-green-50/50'}`}>
              <TableRow className="border-b border-white/10">
                <TableHead className={`py-4 text-left ${isDark ? 'text-white font-semibold' : 'text-gray-800 font-semibold'}`}>Data/Hora</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-white font-semibold' : 'text-gray-800 font-semibold'}`}>Instância</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-white font-semibold' : 'text-gray-800 font-semibold'}`}>Número</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-white font-semibold' : 'text-gray-800 font-semibold'}`}>Tipo</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-white font-semibold' : 'text-gray-800 font-semibold'}`}>Usou IA?</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-white font-semibold' : 'text-gray-800 font-semibold'}`}>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index} className={`border-b border-white/5 hover:bg-green-500/5 transition-colors ${index % 2 === 0 ? 'bg-green-50/20' : ''}`}>
                  <TableCell className={`py-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.date.format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell className="py-4">
                    <Badge className={`font-medium ${isDark ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-800 border-green-200'}`}>{item.instancia}</Badge>
                  </TableCell>
                  <TableCell className={`py-4 max-w-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`} title={item.numero}>
                    {item.numero}
                  </TableCell>
                  <TableCell className={`py-4 capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.tipo_envio}</TableCell>
                  <TableCell className={`py-4 font-medium ${item.usaria ? (isDark ? "text-green-400" : "text-green-600") : (isDark ? "text-red-400" : "text-red-600")}`}>
                    {item.usaria ? <><CheckCircle className="h-4 w-4 inline mr-1 text-green-600" /> Sim</> : <><XCircle className="h-4 w-4 inline mr-1 text-red-600" /> Não</>}
                  </TableCell>
                  <TableCell className={`py-4 max-w-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`} title={item.texto}>
                    <span className="truncate block">{item.texto?.substring(0, 60)}...</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <i className={`fas fa-inbox text-4xl mb-4 text-green-600`}></i>
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
              className={`glass-card ${isDark ? 'border-white/20 text-white hover:bg-green-500/20' : 'border-gray-300 text-gray-700 hover:bg-green-50 border-green-200'}`}
            >
              <i className="fas fa-chevron-left mr-2"></i> Anterior
            </Button>
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Página {currentPage} de {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className={`glass-card ${isDark ? 'border-white/20 text-white hover:bg-green-500/20' : 'border-gray-300 text-gray-700 hover:bg-green-50 border-green-200'}`}
            >
              Próxima <i className="fas fa-chevron-right mr-2"></i>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};