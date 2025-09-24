"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

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
    <Card>
      <CardContent className="p-6">
        <h5 className="font-semibold mb-4 flex items-center gap-2">
          <i className="bi bi-table"></i>Registros de Disparo
        </h5>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Instância</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Usou IA?</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(item.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge>{item.instancia}</Badge></TableCell>
                  <TableCell>{item.numero}</TableCell>
                  <TableCell>{item.tipo_envio}</TableCell>
                  <TableCell>{item.usaria ? "Sim" : "Não"}</TableCell>
                  <TableCell title={item.texto}>{item.texto?.substring(0, 50)}...</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <i className="bi bi-info-circle" style={{ fontSize: "1.5rem" }}></i>
            <p className="mt-2">Nenhum dado encontrado.</p>
          </div>
        )}
        <div className="flex justify-center space-x-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            Anterior
          </Button>
          <span>Página {currentPage} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            Próxima
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};