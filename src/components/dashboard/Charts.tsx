"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from "dayjs";

interface ChartsProps {
  filteredData: any[];
}

const GREEN_COLORS = ["#10B981", "#059669", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"]; // All green variations for unity

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, isDark }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = ((percent * 100).toFixed(0));

  return (
    <text
      x={x}
      y={y}
      fill={isDark ? "white" : "#1f2937"} /* Darker black/gray for light mode labels */
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${percentage}%`}
    </text>
  );
};

// Generic dark/light-aware tooltip for all charts
const GenericTooltipContent = ({ active, payload, label, isDark }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.value || data.envios || 0;
    const name = data.name || label;
    const isPie = data.percentage !== undefined;

    return (
      <div className={`glass-card rounded-lg p-3 shadow-lg min-w-[140px] ${isDark ? 'bg-black/80 border-white/10 text-white' : 'bg-white/95 border-green-200 text-gray-800'}`}>
        <p className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{name}</p>
        <p className={`font-medium text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>{value} envios</p>
        {isPie && <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>({data.percentage}%)</p>}
      </div>
    );
  }
  return null;
};

export const Charts = ({ filteredData }: ChartsProps) => {
  const isDark = document.documentElement.classList.contains('dark');

  const tipoData = filteredData.reduce((acc: Record<string, number>, item) => {
    const key = item.tipo_envio || 'Desconhecido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalTipo: number = (Object.values(tipoData) as number[]).reduce((sum, v) => sum + v, 0);

  const instanciaData = filteredData.reduce((acc: Record<string, number>, item) => {
    const key = item.instancia || 'Desconhecida';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalInstancia: number = (Object.values(instanciaData) as number[]).reduce((sum, v) => sum + v, 0);

  const horaData = Array(24).fill(0);
  filteredData.forEach((item) => {
    const hour = item.date.hour();
    horaData[hour]++;
  });

  const timelineData = filteredData.reduce((acc: Record<string, number>, item) => {
    const day = item.date.format("DD/MM");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedTimeline = Object.keys(timelineData).sort().map((d) => ({ day: d, envios: timelineData[d] }));

  const pieDataTipo = Object.entries(tipoData).map(([name, value]: [string, number]) => ({
    name,
    value,
    percentage: ((value / totalTipo) * 100).toFixed(1)
  }));

  const pieDataInstancia = Object.entries(instanciaData).map(([name, value]: [string, number]) => ({
    name,
    value,
    percentage: ((value / totalInstancia) * 100).toFixed(1)
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 section-mb">
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up">
        <CardContent className="p-8">
          <h5 className={`font-bold mb-6 text-xl flex items-center gap-2 text-shadow ${isDark ? 'gradient-text' : 'text-gray-900'}`}>
            <i className="fas fa-chart-pie text-green-600"></i> Envios por Tipo
          </h5>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataTipo}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#10B981"
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                  label={(entry) => <CustomLabel {...entry} isDark={isDark} />}
                >
                  {pieDataTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <GenericTooltipContent {...props} isDark={isDark} />} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-8">
          <h5 className={`font-bold mb-6 text-xl flex items-center gap-2 text-shadow ${isDark ? 'gradient-text' : 'text-gray-900'}`}>
            <i className="fas fa-server text-green-600"></i> Envios por Instância
          </h5>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataInstancia}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#10B981"
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                  label={(entry) => <CustomLabel {...entry} isDark={isDark} />}
                >
                  {pieDataInstancia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <GenericTooltipContent {...props} isDark={isDark} />} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.2s'}}>
        <CardContent className="p-8">
          <h5 className={`font-bold mb-6 text-xl flex items-center gap-2 text-shadow ${isDark ? 'gradient-text' : 'text-gray-900'}`}>
            <i className="fas fa-clock text-green-600"></i> Envios por Hora
          </h5>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horaData.map((v, i) => ({ hour: i, value: v, name: `Hora ${i}h` }))} margin={{ bottom: 20 }}>
                <CartesianGrid className="chart-grid" strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(16,185,129,0.1)"} />
                <XAxis dataKey="hour" stroke={isDark ? 'white' : '#374151'} interval={3} angle={-45} textAnchor="end" height={80} tick={{ fill: isDark ? 'white' : '#374151', fontSize: 12, className: 'chart-axis' }} />
                <YAxis stroke={isDark ? 'white' : '#374151'} width={50} tick={{ fill: isDark ? 'white' : '#374151', className: 'chart-axis' }} />
                <Tooltip content={(props) => <GenericTooltipContent {...props} isDark={isDark} />} />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-3 glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.3s'}}>
        <CardContent className="p-8">
          <h5 className={`font-bold mb-6 text-xl flex items-center gap-2 text-shadow ${isDark ? 'gradient-text' : 'text-gray-900'}`}>
            <i className="fas fa-chart-line text-green-600"></i> Timeline de Envios
          </h5>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedTimeline.map(item => ({ ...item, name: item.day }))} margin={{ right: 30, bottom: 80 }}>
                <CartesianGrid className="chart-grid" strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(16,185,129,0.1)"} />
                <XAxis dataKey="day" stroke={isDark ? 'white' : '#374151'} angle={-45} textAnchor="end" height={80} interval={0} tick={{ fill: isDark ? 'white' : '#374151', fontSize: 12, className: 'chart-axis' }} />
                <YAxis stroke={isDark ? 'white' : '#374151'} width={50} tick={{ fill: isDark ? 'white' : '#374151', className: 'chart-axis' }} />
                <Tooltip content={(props) => <GenericTooltipContent {...props} isDark={isDark} />} />
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