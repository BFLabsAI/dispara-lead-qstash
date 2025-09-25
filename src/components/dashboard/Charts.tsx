"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart as PieIcon, Clock, Activity, BarChart3, Megaphone, Users, Palette, LayoutGrid, HardDrive } from "lucide-react"; // Adicionado LayoutGrid, HardDrive
import { useTheme } from "@/context/ThemeContext";

interface ChartsProps {
  filteredData: any[];
}

const GREEN_COLORS = ["#10B981", "#059669", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, theme }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = ((percent * 100).toFixed(0));

  return (
    <text
      x={x}
      y={y}
      fill={theme === 'dark' ? "white" : "#1f2937"}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${percentage}%`}
    </text>
  );
};

const GenericTooltipContent = ({ active, payload, label, theme }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.value || data.envios || 0;
    const name = data.name || label;
    const isPie = data.percentage !== undefined;

    return (
      <div className={`glass-card rounded-lg p-3 shadow-lg min-w-[140px] ${theme === 'dark' ? 'bg-black/80 border-white/10 text-white' : 'bg-white/95 border-green-200 text-gray-800'}`}>
        <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">{name}</p>
        <p className={`font-medium text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{value} envios</p>
        {isPie && <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>({data.percentage}%)</p>}
      </div>
    );
  }
  return null;
};

const EmptyChartState = ({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) => (
  <div className="flex flex-col items-center justify-center h-[350px] text-center text-gray-500 dark:text-gray-400">
    <div className="p-4 bg-green-500/20 rounded-xl mb-4 animate-pulse-glow border border-green-500/30">
      <Icon className="h-8 w-8 text-green-600" />
    </div>
    <h4 className="font-bold text-lg mb-2 text-gray-900 dark:gradient-text">{title}</h4>
    <p className="text-sm text-green-600 dark:text-green-400">Aplique filtros ou aguarde dados</p>
  </div>
);

export const Charts = ({ filteredData }: ChartsProps) => {
  const { theme } = useTheme();
  const hasData = filteredData.length > 0;

  const tipoData = filteredData.reduce((acc: Record<string, number>, item) => {
    const key = item.tipo_envio || 'Desconhecido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tipoValues = Object.values(tipoData) as number[];
  const totalTipo: number = tipoValues.reduce((sum: number, v: number) => sum + v, 0);
  const pieDataTipo = Object.entries(tipoData).map(([name, value]) => ({ 
    name, 
    value: Number(value),
    percentage: totalTipo > 0 ? Number(((Number(value) / totalTipo) * 100).toFixed(1)).toString() : "0" 
  }));

  const instanciaData = filteredData.reduce((acc: Record<string, number>, item) => {
    const key = item.instancia || 'Desconhecida';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const instanciaValues = Object.values(instanciaData) as number[];
  const totalInstancia: number = instanciaValues.reduce((sum: number, v: number) => sum + v, 0);
  const pieDataInstancia = Object.entries(instanciaData).map(([name, value]) => ({ 
    name, 
    value: Number(value),
    percentage: totalInstancia > 0 ? Number(((Number(value) / totalInstancia) * 100).toFixed(1)).toString() : "0" 
  }));

  const campaignData = filteredData.reduce((acc: Record<string, number>, item) => {
    const key = item.nome_campanha || 'Desconhecida';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const campaignValues = Object.values(campaignData) as number[];
  const totalCampaign: number = campaignValues.reduce((sum: number, v: number) => sum + v, 0);
  const pieDataCampaign = Object.entries(campaignData).map(([name, value]) => ({ 
    name, 
    value: Number(value),
    percentage: totalCampaign > 0 ? Number(((Number(value) / totalCampaign) * 100).toFixed(1)).toString() : "0" 
  }));

  const publicoData = filteredData.reduce((acc: Record<string, number>, item) => {
    const key = item.publico || 'Desconhecido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const publicoValues = Object.values(publicoData) as number[];
  const totalPublico: number = publicoValues.reduce((sum: number, v: number) => sum + v, 0);
  const pieDataPublico = Object.entries(publicoData).map(([name, value]) => ({ 
    name, 
    value: Number(value),
    percentage: totalPublico > 0 ? Number(((Number(value) / totalPublico) * 100).toFixed(1)).toString() : "0" 
  }));

  const criativoData = filteredData.reduce((acc: Record<string, number>, item) => {
    const key = item.criativo || 'Desconhecido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const criativoValues = Object.values(criativoData) as number[];
  const totalCriativo: number = criativoValues.reduce((sum: number, v: number) => sum + v, 0);
  const pieDataCriativo = Object.entries(criativoData).map(([name, value]) => ({ 
    name, 
    value: Number(value),
    percentage: totalCriativo > 0 ? Number(((Number(value) / totalCriativo) * 100).toFixed(1)).toString() : "0" 
  }));


  const horaData = Array(24).fill(0);
  filteredData.forEach((item) => item.date && horaData[item.date.hour()]++);

  const timelineData = filteredData.reduce((acc: Record<string, number>, item) => {
    if (item.date) {
      const day = item.date.format("DD/MM");
      acc[day] = (acc[day] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const sortedTimeline = Object.keys(timelineData).sort().map((d) => ({ day: d, envios: timelineData[d] }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
      {/* Gráfico de Envios por Campanha */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <Megaphone className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Envios por Campanha</h3>
          </div>
          {hasData ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieDataCampaign} cx="50%" cy="50%" outerRadius={100} fill="#10B981" dataKey="value" nameKey="name" labelLine={false} label={(entry) => <CustomLabel {...entry} theme={theme} />}>
                    {pieDataCampaign.map((entry, index) => <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={(props) => <GenericTooltipContent {...props} theme={theme} />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChartState title="Nenhum envio por campanha" icon={Megaphone} />}
        </CardContent>
      </Card>

      {/* Gráfico de Envios por Público */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.05s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Envios por Público</h3>
          </div>
          {hasData ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieDataPublico} cx="50%" cy="50%" outerRadius={100} fill="#10B981" dataKey="value" nameKey="name" labelLine={false} label={(entry) => <CustomLabel {...entry} theme={theme} />}>
                    {pieDataPublico.map((entry, index) => <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={(props) => <GenericTooltipContent {...props} theme={theme} />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChartState title="Nenhum envio por público" icon={Users} />}
        </CardContent>
      </Card>

      {/* Gráfico de Envios por Criativo */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <Palette className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Envios por Criativo</h3>
          </div>
          {hasData ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieDataCriativo} cx="50%" cy="50%" outerRadius={100} fill="#10B981" dataKey="value" nameKey="name" labelLine={false} label={(entry) => <CustomLabel {...entry} theme={theme} />}>
                    {pieDataCriativo.map((entry, index) => <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={(props) => <GenericTooltipContent {...props} theme={theme} />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChartState title="Nenhum envio por criativo" icon={Palette} />}
        </CardContent>
      </Card>

      {/* Gráfico de Envios por Tipo */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.15s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <LayoutGrid className="h-6 w-6 text-green-600" /> {/* Ícone alterado */}
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Envios por Tipo</h3>
          </div>
          {hasData ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieDataTipo} cx="50%" cy="50%" outerRadius={100} fill="#10B981" dataKey="value" nameKey="name" labelLine={false} label={(entry) => <CustomLabel {...entry} theme={theme} />}>
                    {pieDataTipo.map((entry, index) => <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={(props) => <GenericTooltipContent {...props} theme={theme} />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChartState title="Nenhum envio por tipo" icon={LayoutGrid} />} {/* Ícone alterado */}
        </CardContent>
      </Card>

      {/* Gráfico de Envios por Instância */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.2s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <HardDrive className="h-6 w-6 text-green-600" /> {/* Ícone alterado */}
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Envios por Instância</h3>
          </div>
          {hasData ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieDataInstancia} cx="50%" cy="50%" outerRadius={100} fill="#10B981" dataKey="value" nameKey="name" labelLine={false} label={(entry) => <CustomLabel {...entry} theme={theme} />} >
                    {pieDataInstancia.map((entry, index) => <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={(props) => <GenericTooltipContent {...props} theme={theme} />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChartState title="Nenhum envio por instância" icon={HardDrive} />} {/* Ícone alterado */}
        </CardContent>
      </Card>

      {/* Gráfico de Envios por Hora */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up p-8" style={{animationDelay: '0.25s'}}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Envios por Hora</h3>
          </div>
          {hasData ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={horaData.map((v, i) => ({ hour: i, value: v, name: `${i}h` }))} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(16,185,129,0.1)"} />
                  <XAxis dataKey="hour" stroke="#10B981" interval={3} angle={-45} textAnchor="end" height={80} tick={{ fill: "#10B981", fontSize: 12 }} />
                  <YAxis stroke="#10B981" width={50} tick={{ fill: "#10B981" }} />
                  <Tooltip content={(props) => <GenericTooltipContent {...props} theme={theme} />} />
                  <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChartState title="Nenhum envio por hora" icon={Clock} />}
        </CardContent>
      </Card>

      {/* Timeline de Envios */}
      <Card className="lg:col-span-3 glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.3s'}}>
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/30 rounded-xl animate-pulse-glow border border-green-500/40">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-bold text-xl text-shadow text-gray-900 dark:text-white">
              Timeline de Envios
            </h3>
          </div>
          {hasData ? (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedTimeline.map(item => ({ ...item, name: item.day }))} margin={{ right: 30, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(16,185,129,0.1)"} />
                  <XAxis dataKey="day" stroke="#10B981" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fill: "#10B981", fontSize: 12 }} />
                  <YAxis stroke="#10B981" width={50} tick={{ fill: "#10B981" }} />
                  <Tooltip content={(props) => <GenericTooltipContent {...props} theme={theme} />} />
                  <Line type="monotone" dataKey="envios" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="envios" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChartState title="Nenhum dado na timeline" icon={BarChart3} />}
        </CardContent>
      </Card>
    </div>
  );
};