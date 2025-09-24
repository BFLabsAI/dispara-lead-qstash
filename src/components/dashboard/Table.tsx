"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
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
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up">
      <CardContent className="p-6">
        <h5 className="font-semibold mb-4 flex items-center gap-2 gradient-text">
          <i className="fas fa-table"></i>Registros de Disparo
        </h5>
        <div className="rounded-xl border border-gray-700 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-900/30">
              <TableRow>
                <TableHead className="text-gray-300">Data</TableHead>
                <TableHead className="text-gray-300">Instância</TableHead>
                <TableHead className="text-gray-300">Número</TableHead>
                <TableHead className="text-gray-300">Tipo</TableHead>
                <TableHead className="text-gray-300">Usou IA?</TableHead>
                <TableHead className="text-gray-300">Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="hover:bg-gray-800/20">
              {paginatedData.map((item, index) => (
                <TableRow key={index} className="border-b border-gray-700 hover:bg-gray-800/20 transition-colors">
                  <TableCell className="text-white">{item.date.format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell><Badge className="bg-green-500/20 text-green-300 border-green-500/30">{item.instancia}</Badge></TableCell>
                  <TableCell className="text-gray-300">{item.numero}</TableCell>
                  <TableCell className="text-gray-300">{item.tipo_envio}</TableCell>
                  <TableCell className={item.usaria ? "text-green-400" : "text-red-400"}>
                    {item.usaria ? "Sim" : "Não"}
                  </TableCell>
                  <TableCell title={item.texto} className="text-gray-400 max-w-xs truncate">
                    {item.texto?.substring(0, 50)}...
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 && (
          <div className="text-center py-12 text-gray-400 glass-card rounded-xl mt-6">
            <i className="fas fa-info-circle text-3xl mb-2"></i>
            <p>Nenhum dado encontrado.</p>
          </div>
        )}
        <div className="flex justify-center space-x-4 mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="glass-card border-gray-700 hover:bg-gray-800/50"
          >
            Anterior
          </Button>
          <span className="text-gray-400 self-center">Página {currentPage} de {totalPages}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="glass-card border-gray-700 hover:bg-gray-800/50"
          >
            Próxima
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};