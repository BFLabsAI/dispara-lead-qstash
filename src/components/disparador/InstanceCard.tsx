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
  class: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  indicator: string;
  badge: "default" | "destructive" | "secondary" | "outline" | null | undefined;
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
    ? { class: 'text-green-400', text: 'Ativa e Operacional', icon: CheckCircle, indicator: 'bg-green-500', badge: 'default' }
    : { class: 'text-red-400', text: 'Desconectada', icon: XCircle, indicator: 'bg-red-500', badge: 'destructive' };

  const formattedName = instance.name
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

  return (
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-6 sm:p-8 max-w-full overflow-hidden" style={{animationDelay: `${index * 0.1}s`}}>
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
          <div className="flex-shrink-0 relative">
            <div className="gradient-primary p-3 sm:p-4 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-lg">
              <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className={`absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 h-4 w-4 rounded-full border-2 border-card ${statusConfig.indicator} shadow-lg`}></div>
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-white break-words leading-tight">{formattedName}</h3>
            <Badge variant={statusConfig.badge} className="text-xs sm:text-sm">{statusConfig.text}</Badge>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadInstances}
          className="glass-card text-gray-400 hover:text-white p-2 sm:p-3 rounded-xl hover:bg-white/10 flex-shrink-0 ml-2"
        >
          <i className="fas fa-sync-alt text-sm sm:text-base"></i>
        </Button>
      </div>

      <div className="bg-gray-900/50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
        <div className={`flex items-center justify-center ${statusConfig.class} text-sm sm:text-base`}>
          {React.createElement(statusConfig.icon, { className: "h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" })}
          <span className="font-semibold break-words">{statusConfig.text}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        <Button 
          onClick={() => fetchQrCode(instance.name)}
          className={`btn-premium px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold text-white w-full text-sm sm:text-base ${isConnected ? 'gradient-danger' : 'gradient-success'}`}
        >
          <i className={`fas ${isConnected ? 'fa-power-off' : 'fa-qrcode'} mr-1 sm:mr-2 text-sm sm:text-base`}></i>
          <span className="break-words">{isConnected ? 'Desconectar' : 'Conectar'}</span>
        </Button>
        
        <Button onClick={() => openWebhook(instance.name)} className="btn-premium px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold gradient-primary text-white w-full text-sm sm:text-base">
          <i className="fas fa-project-diagram mr-1 sm:mr-2 text-sm sm:text-base"></i>
          <span className="break-words">Webhook</span>
        </Button>
      </div>
    </Card>
  );
};