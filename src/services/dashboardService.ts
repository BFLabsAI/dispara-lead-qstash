import { getEndpoints } from "./api";
import dayjs from "dayjs";

export const getDashboardData = async () => {
  const endpoints = getEndpoints();
  const response = await fetch(endpoints.DASHBOARD_DATA);
  if (!response.ok) {
    throw new Error("Erro ao carregar dados do dashboard.");
  }
  const result = await response.json();
  const data = Array.isArray(result)
    ? result.map((item: any) => ({
        ...item,
        date: dayjs(item.created_at),
      }))
    : [];
  data.sort((a: any, b: any) => b.date.diff(a.date));
  return data;
};