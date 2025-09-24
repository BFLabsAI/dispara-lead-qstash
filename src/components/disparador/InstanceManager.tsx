"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, QrCode } from "lucide-react";
import { useDisparadorStore } from "./disparadorStore";
import { QrDialog } from "./QrDialog";

export const InstanceManager = () => {
  const { instances, isLoading, loadInstances } = useDisparadorStore();
  const [stats, setStats] = useState({ total: 0, connected: 0, disconnected: 0 });

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    const total = instances.length;
    const connected = instances.filter(i => i.connectionStatus === "open" || i.connectionStatus === "connected").length;
    const disconnected = total - connected;
    setStats({ total, connected, disconnected });
  }, [instances]);

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center animate-scale-in">
        <div className="loading-dots mx-auto mb-6">
          <div></div><div></div><div></div><div></div>
        </div>
        <h3 className="text-2xl font-semibold mb-2 gradient-text">Analisando Conexões</h3>
        <p className="text-gray-400">Carregando dados das instâncias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 card-premium animate-slide-in-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total de Instâncias</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
              <QrCode className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-2xl p-6 card-premium animate-slide-in-up" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Ativas</p>
              <p className="text-3xl font-bold text-green-400">{stats.connected}</p>
            </div>
            <div className="w-12 h-12 gradient-success rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-2xl p-6 card-premium animate-slide-in-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Inativas</p>
              <p className="text-3xl font-bold text-red-400">{stats.disconnected}</p>
            </div>
            <div className="w-12 h-12 gradient-danger rounded-xl flex items-center justify-center">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {instances.length === 0 ? (
          <div className="col-span-full glass-card rounded-3xl p-12 text-center animate-scale-in">
            <QrCode className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2 text-gray-300">Nenhuma Instância Encontrada</h3>
            <p className="text-gray-500">Configure suas primeiras instâncias para começar.</p>
            <Button onClick={loadInstances} className="btn-premium mt-6 px-6 py-3 gradient-primary text-white rounded-xl">
              <i className="fas fa-redo mr-2"></i>
              Buscar Instâncias
            </Button>
          </div>
        ) : (
          instances.map((instance, index) => (
            <InstanceCard key={instance.name} instance={instance} index={index} loadInstances={loadInstances} />
          ))
        )}
      </div>

      <QrDialog />
    </div>
  );
};

const InstanceCard = ({ instance, index, loadInstances }) => {
  const { fetchQrCode } = useDisparadorStore();
  const isConnected = instance.connectionStatus === "open" || instance.connectionStatus === "connected";
  const statusConfig = isConnected 
    ? { class: 'text-green-400', text: 'Ativa e Operacional', icon: CheckCircle, indicator: 'status-online bg-green-500' }
    : { class: 'text-red-400', text: 'Desconectada', icon: XCircle, indicator: 'status-offline bg-red-500' };

  return (
    <Card className="glass-card rounded-3xl p-8 card-premium animate-slide-in-up" style={{animationDelay: `${index * 0.1}s`}}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {/* Placeholder profile pic - replace with real if available */}
            <div className={`w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center border-2 border-gray-700`}>
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <div className={`absolute -bottom-1 -right-1 status-indicator ${statusConfig.indicator}`}></div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{instance.name}</h3>
            <p className="text-gray-400 text-sm">Proprietário: Desconhecido</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadInstances}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
        >
          <i className="fas fa-sync-alt"></i>
        </Button>
      </div>

      <div className="bg-gray-900/50 rounded-2xl p-4 mb-6">
        <div className={`flex items-center justify-center ${statusConfig.class}`}>
          <statusConfig.icon className="h-5 w-5 mr-3" />
          <span className="font-semibold">{statusConfig.text}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button 
          onClick={() => fetchQrCode(instance.name)}
          className={`btn-premium px-6 py-3 rounded-xl font-semibold text-white w-full ${isConnected ? 'gradient-danger' : 'gradient-success'}`}
        >
          <i className={`fas ${isConnected ? 'fa-power-off' : 'fa-qrcode'} mr-2`}></i>
          {isConnected ? 'Desconectar' : 'Conectar'}
        </Button>
        
        <Button className="btn-premium px-6 py-3 rounded-xl font-semibold gradient-primary text-white w-full">
          <i className="fas fa-project-diagram mr-2"></i>
          Webhook
        </Button>
      </div>
    </Card>
  );
};