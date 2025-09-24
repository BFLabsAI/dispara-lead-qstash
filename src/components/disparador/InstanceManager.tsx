"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useDisparadorStore } from "./disparadorStore";

export const InstanceManager = () => {
  const { instances, isLoading, loadInstances } = useDisparadorStore();

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-green-500" />
          <p className="text-muted-foreground">Carregando instâncias...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <i className="bi bi-gear-wide-connected"></i>Gerenciamento de Instâncias
          </h4>
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={isLoading}>
            <i className="bi bi-arrow-clockwise"></i> Atualizar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {instances.length === 0 ? (
            <p className="text-center text-muted-foreground col-span-full">Nenhuma instância encontrada.</p>
          ) : (
            instances.map((instance) => (
              <InstanceCard key={instance.name} instance={instance} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const InstanceCard = ({ instance }: { instance: { name: string; connectionStatus: string } }) => {
  const { fetchQrCode } = useDisparadorStore();
  const isConnected = instance.connectionStatus === "open" || instance.connectionStatus === "connected";
  const statusText = isConnected ? "Conectado" : "Desconectado";
  const statusVariant = isConnected ? "default" : "secondary";

  return (
    <div className="bg-muted p-4 rounded-lg border">
      <div className="flex justify-between items-center mb-3">
        <strong className="font-medium">{instance.name}</strong>
        <Badge variant={statusVariant as any}>{statusText}</Badge>
      </div>
      <Button
        variant="default"
        size="sm"
        className="w-full"
        onClick={() => fetchQrCode(instance.name)}
      >
        <i className="bi bi-qr-code-scan mr-2"></i>Conectar
      </Button>
    </div>
  );
};