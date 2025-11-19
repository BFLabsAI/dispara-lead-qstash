import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Instancias from "./pages/Instancias";
import Disparo from "./pages/Disparo";
import ApiSettings from "./pages/ApiSettings";
import CampaignSchedulerPage from "./pages/CampaignSchedulerPage";
import CopyAgentPage from "./pages/CopyAgentPage"; // Importar a nova página
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./components/ui/sidebar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 segundos
      cacheTime: 300000, // 5 minutos
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Não recarregar ao focar janela
      refetchOnReconnect: true, // Recarregar ao reconectar
    },
    mutations: {
      retry: 1,
    }
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <Routes>
              {/* Rotas que usam o DashboardLayout */}
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/instancias" element={<Instancias />} />
                <Route path="/disparo" element={<Disparo />} />
                <Route path="/agendar-campanha" element={<CampaignSchedulerPage />} />
                <Route path="/copy-agent" element={<CopyAgentPage />} /> {/* Nova rota para o Copy Agent */}
                <Route path="/api-settings" element={<ApiSettings />} />
              </Route>
              
              {/* Rotas que não usam o layout, como a página 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;