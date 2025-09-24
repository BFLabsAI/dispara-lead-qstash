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
    <Card className={`glass-card rounded-2xl card-premium animate-slide-in-up mb-12 section-mb ${isDark ? '' : 'bg-green-50/70 border-green-200'}`}> {/* Unificado: bg/border green no light */}
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <i className={`fas fa-table text-xl text-green-600 shadow-lg`}></i> {/* Ícone bonito com shadow glow */}
          <h5 className={`font-bold text-xl ${isDark ? 'gradient-text' : 'text-gray-900'}`}>Registros de Disparo</h5>
        </div>
        <div className="overflow-x-auto rounded-xl border ${isDark ? 'border-green-900/30 shadow-lg' : 'border-green-200/50 shadow-md'}"> {/* Formatação: Rounded + overflow + border glow */}
          <Table>
            <TableHeader className={`table-header ${isDark ? 'bg-green-900/20 backdrop-blur-sm border-b border-green-900/30 shadow-inner' : 'bg-green-50/50 border-b border-green-200 shadow-sm'}`}> {/* Header glass com glow */}
              <TableRow className={`${isDark ? 'border-b border-green-900/30' : 'border-b border-green-200/50'}`}> {/* Row border subtle green */}
                <TableHead className={`py-4 text-left ${isDark ? 'text-gray-100 font-semibold' : 'text-gray-900 font-semibold'}`}>Data/Hora</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-gray-100 font-semibold' : 'text-gray-900 font-semibold'}`}>Instância</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-gray-100 font-semibold' : 'text-gray-900 font-semibold'}`}>Número</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-gray-100 font-semibold' : 'text-gray-900 font-semibold'}`}>Tipo</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-gray-100 font-semibold' : 'text-gray-900 font-semibold'}`}>Usou IA?</TableHead>
                <TableHead className={`py-4 text-left ${isDark ? 'text-gray-100 font-semibold' : 'text-gray-900 font-semibold'}`}>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index} className={`border-b ${isDark ? 'border-green-900/30 hover:bg-green-800/30 transition-all duration-200 shadow-sm' : 'border-green-200/20 hover:bg-green-500/10 transition-colors'} ${index % 2 === 0 ? (isDark ? 'bg-green-900/10' : 'bg-green-50/20') : (isDark ? 'bg-green-900/20' : 'bg-green-50/10')}`}> {/* Alternating subtle green glass no dark; light green no light; hover com transition glow */}
                  <TableCell className={`py-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{item.date.format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell className="py-4">
                    <Badge className={`font-medium rounded-lg shadow-lg ${isDark ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-800 border-green-200'}`}>{item.instancia}</Badge> {/* Badge vivo com green glow + shadow */}
                  </TableCell>
                  <TableCell className={`py-4 max-w-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-800'}`} title={item.numero}>
                    {item.numero}
                  </TableCell>
                  <TableCell className={`py-4 capitalize ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.tipo_envio}</TableCell>
                  <TableCell className="py-4 font-medium">
                    {item.usaria ? (
                      <Badge variant="default" className={`text-green-800 bg-green-500/20 border-green-500/30 rounded-lg shadow-lg`}>
                        <CheckCircle className="h-3 w-3 inline mr-1 text-green-600" /> Sim {/* Ícone bonito green */}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className={`text-red-800 bg-red-500/20 border-red-500/30 rounded-lg shadow-lg`}>
                        <XCircle className="h-3 w-3 inline mr-1 text-red-600" /> Não {/* Ícone bonito red */}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={`py-4 max-w-lg ${isDark ? 'text-gray-400' : 'text-gray-700'}`} title={item.texto}>
                    <span className="truncate block">{item.texto?.substring(0, 60)}...</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400 bg-green-900/10 shadow-inner' : 'text-gray-500 bg-green-50/50'}`}> {/* Empty state subtle green glass no dark com shadow */}
            <i className={`fas fa-inbox text-4xl mb-4 text-green-600 shadow-lg`}></i> {/* Ícone com shadow glow */}
            <p className="text-lg">Nenhum registro encontrado</p>
            <p className="text-sm mt-1">Aplique filtros ou aguarde novos envios</p>
          </div>
        ) : (
          <div className="flex justify-center items-center space-x-4 mt-8 pt-6 border-t ${isDark ? 'border-green-900/30' : 'border-green-200/50'}"> {/* Pagination border subtle green */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className={`glass-card rounded-lg shadow-md ${isDark ? 'border-green-900/30 text-gray-200 hover:bg-green-800/30' : 'border-green-200 text-gray-900 hover:bg-green-50'}`}
            >
              <i className="fas fa-chevron-left mr-2"></i> Anterior
            </Button>
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>Página {currentPage} de {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className={`glass-card rounded-lg shadow-md ${isDark ? 'border-green-900/30 text-gray-200 hover:bg-green-800/30' : 'border-green-200 text-gray-900 hover:bg-green-50'}`}
            >
              Próxima <i className="fas fa-chevron-right mr-2"></i>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};