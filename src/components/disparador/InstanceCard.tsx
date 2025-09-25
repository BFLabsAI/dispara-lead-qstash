"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Server, CheckCircle } from "lucide-react";
import { formatInstanceName } from "@/lib/formatters";

interface Instance {
  name: string;
  connectionStatus: string;
}

interface InstanceCardProps {
  instance: Instance;
  isSelected: boolean;
  onClick: () => void;
}

export const InstanceCard = ({ instance, isSelected, onClick }: InstanceCardProps) => {
  const isConnected = instance.connectionStatus === "open" || instance.connectionStatus === "connected";

  return (
    <Card
      onClick={isConnected ? onClick : undefined}
      className={cn(
        "p-4 cursor-pointer transition-all border-2 bg-card hover:border-primary/50",
        isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
        !isConnected && "opacity-50 cursor-not-allowed bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-3 rounded-lg bg-muted">
              <Server className="h-6 w-6 text-foreground" />
            </div>
            <span className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-card flex items-center justify-center",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
          </div>
          <div>
            <p className="font-semibold">{formatInstanceName(instance.name)}</p>
            <p className="text-xs text-muted-foreground">{isConnected ? "Conectado" : "Desconectado"}</p>
          </div>
        </div>
        {isSelected && (
          <CheckCircle className="h-6 w-6 text-primary transition-all animate-scale-in" />
        )}
      </div>
    </Card>
  );
};