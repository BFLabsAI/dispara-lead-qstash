import dayjs from "dayjs";
import {
  fetchAllDisparadorData,
  fetchDisparadorDataPaginated,
  fetchRecentDisparadorData,
  subscribeToDisparadorUpdates,
  getDashboardStatsOptimized,
  getDisparadorStats,
  DisparadorData
} from "./supabaseClient";
import { supabase } from "./supabaseClient";

// Legacy function - now uses Supabase directly
export const getDashboardData = async () => {
  try {
    const data = await fetchAllDisparadorData();
    return data
      .map((item: DisparadorData) => ({
        ...item,
        date: dayjs(item.created_at),
      }))
      .sort((a: any, b: any) => b.date.diff(a.date));
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
};

// New real-time subscription function (optimized)
export const subscribeToDashboardData = (callback: (data: any[]) => void) => {
  return subscribeToDisparadorUpdates((data: DisparadorData[]) => {
    const formattedData = data
      .map((item: DisparadorData) => ({
        ...item,
        date: dayjs(item.created_at),
      }))
      .sort((a: any, b: any) => b.date.diff(a.date));

    callback(formattedData);
  }, 1000); // Increased to 1000 recent records for real-time
};

// Optimized server-side paginated data fetching
export const getDashboardDataPaginated = async (
  page: number = 1,
  pageSize: number = 50,
  filters?: {
    instance?: string;
    tipo?: string;
    campaign?: string;
    dateStart?: string;
    dateEnd?: string;
  }
) => {
  try {
    // Use proper server-side pagination
    const result = await fetchDisparadorDataPaginated(page, pageSize, filters);
    const formattedData = result.data
      .map((item: DisparadorData) => ({
        ...item,
        date: dayjs(item.created_at),
      }));

    const totalPages = Math.ceil((result.count || 0) / pageSize);

    return {
      data: formattedData,
      count: result.count || 0,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  } catch (error) {
    console.error('Error loading paginated dashboard data:', error);
    throw error;
  }
};

// Get all dashboard data without pagination - OTIMIZADA
export const getDashboardDataAll = async (filters?: {
  instance?: string;
  tipo?: string;
  campaign?: string;
  dateStart?: string;
  dateEnd?: string;
}) => {
  try {
    // Use a função otimizada do supabaseClient que agora não tem limite
    const data = await fetchAllDisparadorData();

    // Apply client-side filters if needed (já que estamos buscando todos os dados)
    let filteredData = data;

    if (filters?.instance) {
      filteredData = filteredData.filter(item => item.instancia === filters.instance);
    }
    if (filters?.tipo) {
      filteredData = filteredData.filter(item => item.tipo_envio === filters.tipo);
    }
    if (filters?.campaign) {
      filteredData = filteredData.filter(item => item.nome_campanha === filters.campaign);
    }
    if (filters?.dateStart) {
      filteredData = filteredData.filter(item =>
        dayjs(item.created_at).isSameOrAfter(filters.dateStart)
      );
    }
    if (filters?.dateEnd) {
      filteredData = filteredData.filter(item =>
        dayjs(item.created_at).isSameOrBefore(filters.dateEnd)
      );
    }

    const formattedData = filteredData.map((item: DisparadorData) => ({
      ...item,
      date: dayjs(item.created_at),
    }));

    return {
      data: formattedData,
      count: formattedData.length
    };
  } catch (error) {
    console.error('Error loading all dashboard data:', error);
    throw error;
  }
};

// Get dashboard statistics (optimized)
export const getDashboardStats = async () => {
  try {
    return await getDashboardStatsOptimized();
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      total: 0,
      successful: 0,
      failed: 0,
      withAI: 0,
      successRate: 0,
      instanceStats: {},
      campaignStats: {}
    };
  }
};

export const getCampaignStats = async () => {
  try {
    const { fetchCampaignStats } = await import("./supabaseClient");
    return await fetchCampaignStats();
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    return [];
  }
};