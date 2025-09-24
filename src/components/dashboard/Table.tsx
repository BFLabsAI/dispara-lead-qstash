"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import dayjs from "dayjs";
import { useTheme } from "@/context/ThemeContext";

interface TableProps {
  data: any[];
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

export const DashboardTable = ({ data, currentPage, totalPages, onPageChange }: TableProps) => {
  const { isDark } = useTheme();
  const itemsPerPage = 5;
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up mb-12 section-mb">
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <i className={`fas fa-table text-xl ${isDark ? 'text-green-400 shadow-lg animate-pulse-glow' : 'text-green-600 shadow-lg animate-pulse-glow'}`}></i>
          <h5 className={`font-bold text-xl gradient-text ${isDark ? 'text-white' : 'text-gray-900'}`}>Registros de Disparo</h5>
        </div>
        <div className={`overflow-x-auto rounded-xl border shadow-lg ${
          isDark 
            ? 'border-green-500/30 bg-green-900/10 backdrop-blur-sm' 
            : 'border-green-200/50 bg-white/50'
        }`}>
          <Table>
            <TableHeader className={`table-header ${
              isDark 
                ? 'bg-green-900/30 backdrop-blur-sm border-b border-green-500/40 shadow-sm' 
                : 'bg-green-50/70 backdrop-blur-sm border-b border-green-200 shadow-sm'
            }`}>
              <TableRow className={`border-b ${
                isDark 
                  ? 'border-green-500/20' 
                  : 'border-green-200/50'
              }`}>
                <TableHead className={`py-4 text-left font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Data/Hora</TableHead>
                <TableHead className={`py-4 text-left font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Instância</TableHead>
                <TableHead className={`py-4 text-left font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Número</TableHead>
                <TableHead className={`py-4 text-left font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Tipo</TableHead>
                <TableHead className={`py-4 text-left font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Usou IA?</TableHead>
                <TableHead className={`py-4 text-left font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index} className={`border-b transition-colors ${
                  isDark 
                    ? 'border-green-500/10 hover:bg-green-500/15' 
                    : 'border-green-200/20 hover:bg-green-500/5'
                } ${
                  index % 2 === 0 
                    ? (isDark ? 'bg-green-900/15' : 'bg-green-50/30') 
                    : (isDark ? 'bg-green-900/25' : 'bg-green-50/10')
                }`}>
                  <TableCell className={`py-4 font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>{item.date.format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell className="py-4">
                    <Badge className={`font-medium rounded-lg shadow-lg animate-pulse-glow ${
                      isDark 
                        ? 'bg-green-500/30 text-green-200 border-green-500/50' 
                        : 'bg-green-100 text-green-800 border-green-200'
                    }`}>
                      {item.instancia}
                    </Badge>
                  </TableCell>
                  <TableCell className={`py-4 max-w-xs truncate ${
                    isDark ? 'text-gray-200' : 'text-gray-900'
                  }`} title={item.numero}>
                    {item.numero}
                  </TableCell>
                  <TableCell className={`py-4 capitalize ${
                    isDark ? 'text-gray-200' : 'text-gray-900'
                  }`}>{item.tipo_envio}</TableCell>
                  <TableCell className="py-4 font-medium">
                    {item.usaria ? (
                      <Badge variant="default" className={`rounded-lg shadow-lg animate-pulse-glow ${
                        isDark 
                          ? 'text-green-300 bg-green-500/30 border-green-500/50' 
                          : 'text-green-800 bg-green-500/20 border-green-500/30'
                      }`}>
                        <CheckCircle className={`h-3 w-3 inline mr-1 ${
                          isDark ? 'text-green-300' : 'text-green-600'
                        }`} /> Sim
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className={`rounded-lg shadow-lg ${
                        isDark 
                          ? 'text-red-300 bg-red-500/30 border-red-500/50' 
                          : 'text-red-800 bg-red-500/20 border-red-500/30'
                      }`}>
                        <XCircle className={`h-3 w-3 inline mr-1 ${
                          isDark ? 'text-red-300' : 'text-red-600'
                        }`} /> Não
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={`py-4 max-w-lg ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`} title={item.texto}>
                    <span className="truncate block">{item.texto?.substring(0, 60)}...</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${
            isDark 
              ? 'bg-green-900/20 backdrop-blur-sm border-green-500/30' 
              : 'bg-green-50/50 backdrop-blur-sm border border-green-200/50'
          }`}>
            <i className={`fas fa-inbox text-4xl mb-4 ${
              isDark ? 'text-green-400 shadow-lg animate-pulse-glow' : 'text-green-600 shadow-lg animate-pulse-glow'
            }`}></i>
            <p className={`text-lg ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Nenhum registro encontrado</p>
            <p className={`text-sm mt-1 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>Aplique filtros ou aguarde novos envios</p>
          </div>
        ) : (
          <div className={`flex justify-center items-center space-x-4 mt-8 pt-6 border-t ${
            isDark 
              ? 'border-green-500/30 bg-green-900/10' 
              : 'border-green-200/50 bg-white/50'
          }`}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className={`glass-card rounded-lg shadow-md ${
                isDark 
                  ? 'border-green-500/30 text-white hover:bg-green-500/20' 
                  : 'border-green-200 text-gray-900 hover:bg-green-50'
              }`}
            >
              <i className="fas fa-chevron-left mr-2"></i> Anterior
            </Button>
            <span className={`font-medium ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Página {currentPage} de {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className={`glass-card rounded-lg shadow-md ${
                isDark 
                  ? 'border-green-500/30 text-white hover:bg-green-500/20' 
                  : 'border-green-200 text-gray-900 hover:bg-green-50'
              }`}
            >
              Próxima <i className="fas fa-chevron-right mr-2"></i>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};