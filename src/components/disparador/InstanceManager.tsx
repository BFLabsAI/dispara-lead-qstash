"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, QrCode, Server, Zap, Link } from "lucide-react";
import { useDisparadorStore } from "./disparadorStore";
import { QrDialog } from "./QrDialog";
import { showError, showSuccess } from "@/utils/toast";

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
      <div className="flex flex-col items-center justify-center min-h-[400px] glass-card rounded-3xl p-12 animate-scale-in mx-auto max-w-4xl">
        <div className="loading-dots mx-auto mb-8">
          <div></div><div></div><div></div><div></div>
        </div>
        <h3 className="text-3xl font-bold mb-4 gradient-text">Analisando Conexões</h3>
        <p className="text-xl text-gray-400">Carregando instâncias premium...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-6"> {/* Increased space/px */}
      {/* Stats - Larger, more spaced */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-2 font-medium">Total Instâncias</p>
              <p className="text-4xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="gradient-primary p-4 rounded-xl animate-pulse-glow">
              <Server className="h-8 w-8 text-white" />
            </div>
          </div>
        </Card>
        
        <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-2 font-medium">Ativas</p>
              <p className="text-4xl font-bold text-green-400">{stats.connected}</p>
            </div>
            <div className="gradient-success p-4 rounded-xl animate-pulse-glow">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
        </Card>
        
        <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-2 font-medium">Inativas</p>
              <p className="text-4xl font-bold text-red-400">{stats.disconnected}</p>
            </div>
            <div className="gradient-danger p-4 rounded-xl animate-pulse-glow">
              <XCircle className="h-8 w-8 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Instances Grid - Larger gap, full beauty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {instances.length === 0 ? (
          <Card className="col-span-full glass-card rounded-3xl p-16 text-center animate-scale-in">
            <QrCode className="h-20 w-20 text-gray-500 mx-auto mb-6 animate-pulse" />
            <h3 className="text-3xl font-bold mb-4 text-gray-300">Nenhuma Instância</h3>
            <p className="text-xl text-gray-500 mb-8 max-w-md mx-auto">Comece criando suas primeiras conexões WhatsApp para disparos premium.</p>
            <Button onClick={loadInstances} className="btn-premium px-8 py-4 text-lg gradient-primary">
              <i className="fas fa-magic mr-2"></i> Criar Instância
            </Button>
          </Card>
        ) : (
          instances.map((instance, index) => (
            <InstanceCard key={instance.name} instance={instance} index={index} loadInstances={loadInstances} openWebhook={openWebhook} />
          ))
        )}
      </div>

      <QrDialog />

      {/* Premium Webhook Modal */}
      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent className="glass-card max-w-4xl max-h-[80vh] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="gradient-text text-2xl flex items-center gap-2">
              <Link className="h-6 w-6" />
              Configurar Webhook - {webhookInstance}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Integre eventos do WhatsApp com seu sistema externo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white font-medium">URL de Destino</Label>
              <Input 
                value={webhookUrl} 
                onChange={(e) => setWebhookUrl(e.target.value)} 
                placeholder="https://seu-sistema.com/api/webhook"
                className="h-12 text-white bg-black/30 border-white/20"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-white font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Eventos Ativos ({selectedEvents.length})
              </Label>
              <ScrollArea className="h-48 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="space-y-3">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <Checkbox 
                        id={event}
                        checked={selectedEvents.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                        className="border-white/30 data-[state=checked]:bg-green-500"
                      />
                      <Label htmlFor={event} className="text-white text-sm font-medium cursor-pointer flex-1">
                        {event.replace(/_/g, ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setWebhookOpen(false)} className="glass-card text-gray-300">
              Cancelar
            </Button>
            <Button onClick={saveWebhook} className="btn-premium gradient-success px-8" disabled={!webhookUrl.trim()}>
              <i className="fas fa-save mr-2"></i> Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InstanceCard = ({ instance, index, loadInstances, openWebhook }) => {
  const { fetchQrCode } = useDisparadorStore();
  const isConnected = instance.connectionStatus === "open" || instance.connectionStatus === "connected";
  const statusConfig = isConnected 
    ? { class: 'text-green-400', text: 'Ativa e Operacional', icon: CheckCircle, indicator: 'status-online bg-green-500', badge: 'success' }
    : { class: 'text-red-400', text: 'Desconectada', icon: XCircle, indicator: 'status-offline bg-red-500', badge: 'destructive' };

  return (
    <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: `${index * 0.1}s`}}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="gradient-primary p-4 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-lg">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <div className={`absolute -bottom-2 -right-2 status-indicator ${statusConfig.indicator} shadow-lg`}></div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white">{instance.name}</h3>
            <Badge variant={statusConfig.badge} className="text-sm">{statusConfig.text}</Badge>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadInstances}
          className="glass-card text-gray-400 hover:text-white p-3 rounded-xl hover<dyad-problem-report summary="10 problems">
<problem file="src/components/dashboard/Charts.tsx" line="90" column="47" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Charts.tsx" line="90" column="142" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Charts.tsx" line="91" column="32" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Charts.tsx" line="91" column="84" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Charts.tsx" line="109" column="46" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Charts.tsx" line="109" column="141" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Charts.tsx" line="110" column="32" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Charts.tsx" line="110" column="84" code="2304">Cannot find name 'isDark'.</problem>
<problem file="src/components/dashboard/Table.tsx" line="51" column="39" code="2304">Cannot find name 'CheckCircle'.</problem>
<problem file="src/components/dashboard/Table.tsx" line="51" column="98" code="2304">Cannot find name 'XCircle'.</problem>
</dyad-problem-report><dyad-write path="src/components/dashboard/Charts.tsx" description="Fix isDark errors: define isDark locally using document.classList for theme detection (reactive via re-render on toggle); remove unused RechartsContainer.">
"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from "dayjs";

interface ChartsProps {
  filteredData: any[];
}

const COLORS = ["#10B981", "#059669", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6"];

export const Charts = ({ filteredData }: ChartsProps) => {
  const isDark = document.documentElement.classList.contains('dark'); // Detect theme globally

  const tipoData = filteredData.reduce((acc, item) => {
    acc[item.tipo_envio || 'Desconhecido'] = (acc[item.tipo_envio || 'Desconhecido'] || 0) + 1;
    return acc;
  }, {} as any);

  const instanciaData = filteredData.reduce((acc, item) => {
    acc[item.instancia || 'Desconhecida'] = (acc[item.instancia || 'Desconhecida'] || 0) + 1;
    return acc;
  }, {} as any);

  const horaData = Array(24).fill(0);
  filteredData.forEach((item) => {
    const hour = item.date.hour();
    horaData[hour]++;
  });

  const timelineData = filteredData.reduce((acc, item) => {
    const day = item.date.format("DD/MM");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as any);
  const sortedTimeline = Object.keys(timelineData).sort().map((d) => ({ day: d, envios: timelineData[d] }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 section-mb"> {/* Increased gap/mb for beauty */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up">
        <CardContent className="p-8"> {/* Increased padding */}
          <h5 className="font-bold mb-6 text-xl flex items-center gap-2 gradient-text text-shadow">
            <i className="fas fa-chart-pie"></i> Envios por Tipo
          </h5>
          <div className="h-[350px]"> {/* Taller for no cut-off */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={Object.entries(tipoData)} dataKey="1" nameKey="0" cx="50%" cy="50%" outerRadius={100} fill="#10B981" labelLine={false}>
                  {Object.entries(tipoData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} envios`, '']} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-8">
          <h5 className="font-bold mb-6 text-xl flex items-center gap-2 gradient-text text-shadow">
            <i className="fas fa-server"></i> Envios por Instância
          </h5>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={Object.entries(instanciaData)} dataKey="1" nameKey="0" cx="50%" cy="50%" outerRadius={100} fill="#10B981" labelLine={false}>
                  {Object.entries(instanciaData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} envios`, '']} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.2s'}}>
        <CardContent className="p-8">
          <h5 className="font-bold mb-6 text-xl flex items-center gap-2 gradient-text text-shadow">
            <i className="fas fa-clock"></i> Envios por Hora
          </h5>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horaData.map((v, i) => ({ hour: i, value: v }))} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke={isDark ? 'white' : 'gray'} interval={3} angle={-45} textAnchor="end" height={80} tick={{ fill: isDark ? 'white' : 'gray', fontSize: 12 }} />
                <YAxis stroke={isDark ? 'white' : 'gray'} width={50} tick={{ fill: isDark ? 'white' : 'gray' }} />
                <Tooltip labelFormatter={(label) => `Hora ${label}h`} />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-3 glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.3s'}}>
        <CardContent className="p-8">
          <h5 className="font-bold mb-6 text-xl flex items-center gap-2 gradient-text text-shadow">
            <i className="fas fa-chart-line"></i> Timeline de Envios
          </h5>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedTimeline} margin={{ right: 30, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke={isDark ? 'white' : 'gray'} angle={-45} textAnchor="end" height={80} interval={0} tick={{ fill: isDark ? 'white' : 'gray', fontSize: 12 }} />
                <YAxis stroke={isDark ? 'white' : 'gray'} width={50} tick={{ fill: isDark ? 'white' : 'gray' }} />
                <Tooltip labelFormatter={(label) => `Dia: ${label}`} />
                <Line type="monotone" dataKey="envios" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="envios" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="top" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};