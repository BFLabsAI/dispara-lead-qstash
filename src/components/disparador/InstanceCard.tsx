"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDisparadorStore } from "../../store/disparadorStore";
import { CheckCircle, XCircle, QrCode } from "lucide-react";

interface Instance {
  name: string;
  connectionStatus: string;
}

interface StatusConfig {
  text: string;
  badgeClass: string;
  dotClass: string;
  textClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}

interface InstanceCardProps {
  instance: Instance;
  index: number;
  loadInstances: () => void;
  openWebhook: (name: string) => void;
}

export const InstanceCard = ({ instance, index, loadInstances, openWebhook }: InstanceCardProps) => {
  const { fetchQrCode } = useDisparadorStore();
  const isConnected = instance.connectionStatus === "open" || instance.connectionStatus === "connected";

  const statusConfig: StatusConfig = isConnected
    ? {
        text: "Ativa e Operacional",
        badgeClass:
          "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20",
        dotClass: "bg-green-500",
        textClass: "text-green-700 dark:text-green-300",
        Icon: CheckCircle,
      }
    : {
        text: "Desconectada",
        badgeClass:
          "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20",
        dotClass: "bg-red-500",
        textClass: "text-red-700 dark:text-red-300",
        Icon: XCircle,
      };

  const formattedName = instance.name
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <Card
      className="glass-card rounded-2xl border border-green-200/40 dark:border-green-500/20 shadow-sm animate-slide-in-up p-5 sm:p-6 transition-all hover:border-primary/50 hover:shadow-lg"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative">
            <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 shadow-[0_10px_25px_-10px_rgba(16,185,129,0.6)]">
              <QrCode className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full ring-2 ring-card ${statusConfig.dotClass}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold truncate">{formattedName}</h3>
            <div className={`inline-flex items-center gap-2 mt-1 px-2.5 py-1 rounded-full ${statusConfig.badgeClass}`}>
              {React.createElement(statusConfig.Icon, { className: "h-4 w-4" })}
              <span className="text-xs sm:text-sm font-medium">{statusConfig.text}</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={loadInstances}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Atualizar"
        >
          <i className="fas fa-sync-alt text-sm" />
        </Button>
      </div>

      {/* Info strip */}
      <div className="rounded-lg border bg-muted/40 px-3 py-2 mb-4">
        <div className={`flex items-center justify-center gap-2 text-sm font-medium ${statusConfig.textClass}`}>
          {React.createElement(statusConfig.Icon, { className: "h-4 w-4" })}
          <span>{statusConfig.text}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isConnected ? (
          <Button
            variant="destructive"
            onClick={() => fetchQrCode(instance.name)}
            className="w-full"
          >
            <i className="fas fa-power-off mr-2" />
            Desconectar
          </Button>
        ) : (
          <Button
            onClick={() => fetchQrCode(instance.name)}
            className="w-full"
          >
            <i className="fas fa-qrcode mr-2" />
            Conectar
          </Button>
        )}
        <Button
          onClick={() => openWebhook(instance.name)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-700/20"
        >
          <i className="fas fa-project-diagram mr-2" />
          Webhook
        </Button>
      </div>
    </Card>
  );
};