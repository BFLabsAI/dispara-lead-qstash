"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from "dayjs";

interface ChartsProps {
  filteredData: any[];
}

const COLORS = ["#10e57f", "#00d084", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"];

export const Charts = ({ filteredData }: ChartsProps) => {
  // Tipo chart data
  const tipoData = filteredData.reduce((acc, item) => {
    acc[item.tipo_envio] = (acc[item.tipo_envio] || 0) + 1;
    return acc;
  }, {} as any);

  // Instancia chart data
  const instanciaData = filteredData.reduce((acc, item) => {
    acc[item.instancia] = (acc[item.instancia] || 0) + 1;
    return acc;
  }, {} as any);

  // Hora chart data
  const horaData = Array(24).fill(0);
  filteredData.forEach((item) => {
    const hour = item.date.hour();
    horaData[hour]++;
  });

  // Timeline data
  const timelineData = filteredData.reduce((acc, item) => {
    const day = item.date.format("YYYY-MM-DD");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as any);
  const sortedTimeline = Object.keys(timelineData).sort().map((d) => ({ day: d, envios: timelineData[d] }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2">
            <i className="bi bi-pie-chart-fill"></i>Envios por Tipo
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={Object.entries(tipoData)} dataKey="1" nameKey="0" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                {Object.entries(tipoData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2">
            <i className="bi bi-pie-chart-fill"></i>Envios por Instância
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={Object.entries(instanciaData)} dataKey="1" nameKey="0" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                {Object.entries(instanciaData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2">
            <i className="bi bi-clock-history"></i>Envios por Hora
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={horaData.map((v, i) => ({ hour: i, value: v }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#00d084" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardContent className="p-6">
          <h5 className="font-semibold mb-4 flex items-center gap-2">
            <i className="bi bi-graph-up"></i>Timeline de Envios
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={sortedTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="envios" stroke="#00d084" fillOpacity={0.3} />
              <Area type="monotone" dataKey="envios" stroke="#00d084" fill="#00d084" fillOpacity={0.3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};