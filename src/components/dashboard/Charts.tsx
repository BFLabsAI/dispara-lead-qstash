"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from "dayjs";

interface ChartsProps {
  filteredData: any[];
}

const COLORS = ["#10B981", "#059669", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6"];

export const Charts = ({ filteredData }: ChartsProps) => {
  const isDark = document.documentElement.classList.contains('dark');

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 section-mb">
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up">
        <CardContent className="p-8">
          <h5 className="font-bold mb-6 text-xl flex items-center gap-2 gradient-text text-shadow">
            <i className="fas fa-chart-pie"></i> Envios por Tipo
          </h5>
          <div className="h-[350px]">
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