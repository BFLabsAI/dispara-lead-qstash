"use client";

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, QrCode, Server, Zap, Link } from "lucide-react";
import { useDisparadorStore } from "../../store/disparadorStore";
import { QrDialog } from "./QrDialog";
import { showError, showSuccess } from "@/utils/toast";
import { InstanceCard } from "./InstanceCard";

const WEBHOOK_EVENTS = [
  "MESSAGES_UPSERT", "CONTACTS_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE", "GROUP_UPDATE", "CALL"
];

export const InstanceManager = () => {
  const location = useLocation();
  const { instances, isLoading, loadInstances, resetQr } = useDisparadorStore();
  const [stats, setStats] = useState({ total: 0, connected: 0, disconnected: 0 });
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookInstance, setWebhookInstance] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    resetQr();
  }, [location.pathname, resetQr]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    const total = instances.length;
    const connected = instances.filter(i => i.connectionStatus === "open" || i.connectionStatus === "connected").length;
    const disconnected = total - connected;
    setStats({ total, connected, disconnected });
  }, [instances]);

  const openWebhook = (instanceName: string) => {
    setWebhookInstance(instanceName);
    setWebhookUrl("");
    setSelectedEvents([]);
    setWebhookOpen(true);
  };

  const saveWebhook = () => {
    if (!webhookUrl.trim()) {
      showError("URL do webhook é obrigatória.");
      return;
    }
    showSuccess(`Webhook configurado para ${webhookInstance}! URL: ${webhookUrl} | Eventos: ${selectedEvents.length}`);
    setWebhookOpen(false);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border bg-card p-12 shadow-sm">
        <div className="loading-dots mx-auto mb-8">
          <div></div><div></div><div></div><div></div>
        </div>
        <h3 className="text-2xl font-semibold mb-2">Carregando instâncias...</h3>
        <p className="text-muted-foreground">Aguarde enquanto buscamos suas conexões</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Stats - estilo semelhante aos KPIs do dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card animate-slide-in-up rounded-2xl shadow-md p-6 gradient-primary text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg border border-white/20">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold">Total Instâncias</h4>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card animate-slide-in-up rounded-2xl shadow-md p-6 gradient-primary text-white" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg border border-white/20">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold">Ativas</h4>
              <p className="text-3xl font-bold">{stats.connected}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card animate-slide-in-up rounded-2xl shadow-md p-6 gradient-primary text-white" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg border border-white/20">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold">Inativas</h4>
              <p className="text-3xl font-bold">{stats.disconnected}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de instâncias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {instances.length === 0 ? (
          <Card className="col-span-full glass-card rounded-2xl p-14 text-center shadow-md">
            <QrCode className="h-16 w-16 mx-auto mb-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-2xl font-semibold mb-2">Nenhuma instância</h3>
            <p className="text-muted-foreground mb-6">Crie suas primeiras conexões para começar a disparar.</p>
            <Button onClick={loadInstances} className="btn-premium">
              <i className="fas fa-sync-alt mr-2" /> Atualizar
            </Button>
          </Card>
        ) : (
          instances.map((instance, index) => (
            <InstanceCard
              key={instance.name}
              instance={instance}
              index={index}
              loadInstances={loadInstances}
              openWebhook={openWebhook}
            />
          ))
        )}
      </div>

      <QrDialog />

      {/* Webhook Modal com acento azul */}
      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent className="max-w-4xl rounded-xl glass-card border-blue-200/40 dark:border-blue-800/40 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-600/15 border border-blue-600/30">
                <Link className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </span>
              <span>Configurar Webhook - {webhookInstance}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Integre eventos do WhatsApp com seu sistema externo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>URL de Destino</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-sistema.com/api/webhook"
              />
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Eventos Ativos ({selectedEvents.length})
              </Label>
              <ScrollArea className="h-48 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/40 p-3">
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-3 p-2 rounded-md hover:bg-blue-500/10">
                      <Checkbox
                        id={event}
                        checked={selectedEvents.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <Label htmlFor={event} className="text-sm cursor-pointer flex-1">
                        {event.replace(/_/g, " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWebhookOpen(false)}>Cancelar</Button>
            <Button onClick={saveWebhook} disabled={!webhookUrl.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              <i className="fas fa-save mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};