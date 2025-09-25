"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDisparadorStore } from "../../store/disparadorStore";
import { Server, QrCode, Link, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface Instance {
  name: string;
  connectionStatus: string;
}

interface InstanceCardProps {
  instance: Instance;
  loadInstances: () => void;
  openWebhook: (instanceName: string) => void;
}

export const InstanceCard = ({ instance, loadInstances, openWebhook }: InstanceCardProps) => {
  const { fetchQrCode } = useDisparadorStore();
  const isConnected = instance.connectionStatus === "open" || instance.connectionStatus === "connected";

  return (
    <Card className={cn("glass-card rounded-2xl shadow-md transition-all hover:shadow-lg", { "border-green-500/50": isConnected, "border-red-500/50": !isConnected })}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", isConnected ? "bg-green-500/10" : "bg-red-500/10")}>
              <Server className={cn("h-6 w-6", isConnected ? "text-green-600" : "text-red-600")} />
            </div>
            <h4 className="font-bold text-lg">{instance.name}</h4>
          </div>
          <div className={cn("flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full", isConnected ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700")}>
            {isConnected ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <span>{isConnected ? "Conectado" : "Desconectado"}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openWebhook(instance.name)}>
            <Link className="h-4 w-4 mr-2" /> Webhook
          </Button>
          <Button variant="outline" size="sm" onClick={loadInstances}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          {!isConnected && (
            <Button size="sm" onClick={() => fetchQrCode(instance.name)} className="bg-green-600 hover:bg-green-700 text-white">
              <QrCode className="h-4 w-4 mr-2" /> Conectar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};