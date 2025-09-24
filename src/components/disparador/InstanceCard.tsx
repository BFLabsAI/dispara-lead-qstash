"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDisparadorStore } from "../../store/disparadorStore";

interface InstanceCardProps {
  instance: {
    name: string;
    connectionStatus: string;
  };
}

export const InstanceCard = ({ instance }: InstanceCardProps) => {
  const { fetchQrCode } = useDisparadorStore();
  const isConnected = instance.connectionStatus === "open" || instance.connectionStatus === "connected";
  const statusText = isConnected ? "Conectado" : "Desconectado";
  const statusVariant = isConnected ? "default" : "destructive";

  return (
    <div className="bg-background border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <strong className="text-foreground">{instance.name}</strong>
        <Badge variant={statusVariant}>{statusText}</Badge>
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