"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from "dayjs";

interface ChartsProps {
  filteredData: any[];
}

const COLORS = ["#10B981", "#059669", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6"];

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value, isDark }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = ((percent * 100).toFixed(0));

  return (
    <text
      x={x}
      y={y}
      fill={isDark ? "white" : "black"}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${name}: ${value} (${percentage}%)`}
    </text>
  );
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 section-mb max-w-full overflow-hidden">
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up">
        <CardContent className="p-8">
          <h5 className="font-bold mb-6 text-xl flex items-center gap-2 gradient-text text-shadow">
            <i className="fas fa-chart-pie"></i> Envios por Tipo
          </h5>
          <div className="h-[400px] max-w-full overflow-hidden">
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value} envios (${props.payload.percentage}%)`,
                    name
                  ]} 
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ paddingLeft: '10px', fontSize: '12px', maxHeight: '300px', overflowY: 'auto' }} 
                />
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
          <div className="h-[400px] max-w-full overflow-hidden">
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value} envios (${props.payload.percentage}%)`,
                    name
                  ]} 
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ paddingLeft: '10px', fontSize: '12px', maxHeight: '300px', overflowY: 'auto' }} 
                />
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
          <div className="h-[400px]">
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
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedTimeline} margin={{ right: 30, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke={isDark ? 'white' : 'gray'} angle={-45} textAnchor="end" height={80} interval={0} tick={{ fill: isDark ? 'white' : 'gray', fontSize: 12 }} />
                <YAxis stroke={isDark ? 'white' : 'gray'} width={50} tick={{ fill: isDark ? 'white' : 'gray' }} />
                <Tooltip labelFormatter={(label) => `Dia: ${label}`} />
                <Line type="monotone" dataKey="envios" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="envios" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '14px' }} verticalAlign="top" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};