"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from "dayjs";

interface ChartsProps {
  filteredData: any[];
}

const COLORS = ["#10B981", "#059669", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6"];

export const Charts = ({ filteredData }: ChartsProps) => {
  const tipoData = filteredData.reduce((acc, item) => {
    acc[item.tipo_envio] = (acc[item.tipo_envio] || 0) + 1;
    return acc;
  }, {} as any);

  const instanciaData = filteredData.reduce((acc, item) => {
    acc[item.instancia] = (acc[item.instancia] || 0) + 1;
    return acc;
  }, {} as any);

  const horaData = Array(24).fill(0);
  filteredData.forEach((item) => {
    const hour = item.date.hour();
    horaData[hour]++;
  });

  const timelineData = filteredData.reduce((acc, item) => {
    const day = item.date.format("YYYY-MM-DD");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as any);
  const sortedTimeline = Object.keys(timelineData).sort().map((d) => ({ day: d, envios: timelineData[d] }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 px-4"> {/* Added mb-8 and px-4 for spacing */}
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up">
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2 gradient-text">
            <i className="fas fa-chart-pie"></i>Envios por Tipo
          </h5>
          <div className="h-[300px]"> {/* Fixed height container */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={Object.entries(tipoData)} dataKey="1" nameKey="0" cx="50%" cy="50%" outerRadius={80} fill="#10B981" label>
                  {Object.entries(tipoData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '10px' }} /> {/* Added padding for legend */}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2 gradient-text">
            <i className="fas fa-server"></i>Envios por Instância
          </h5>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={Object.entries(instanciaData)} dataKey="1" nameKey="0" cx="50%" cy="50%" outerRadius={80} fill="#10B981">
                  {Object.entries(instanciaData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.2s'}}>
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2 gradient-text">
            <i className="fas fa-clock"></i>Envios por Hora
          </h5>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horaData.map((v, i) => ({ hour: i, value: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke="gray" interval={4} angle={-45} textAnchor="end" height={60} /> {/* Rotated labels, extra height */}
                <YAxis stroke="gray" width={40} /> {/* Fixed width */}
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-3 glass-card rounded-2xl card-premium animate-slide-in-up" style={{animationDelay: '0.3s'}}>
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2 gradient-text">
            <i className="fas fa-chart-line"></i>Timeline de Envios
          </h5>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedTimeline} margin={{ right: 30, bottom: 20 }}> {/* Added margins */}
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="gray" angle={-45} textAnchor="end" height={60} interval={Math.max(0, sortedTimeline.length - 5)} /> {/* Rotated, spaced labels */}
                <YAxis stroke="gray" width={40} />
                <Tooltip />
                <Line type="monotone" dataKey="envios" stroke="#10B981" strokeWidth={3} />
                <Area type="monotone" dataKey="envios" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};