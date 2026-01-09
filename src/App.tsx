import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Instancias from "./pages/Instancias";
import Disparo from "./pages/Disparo";
import Audiences from "./pages/Audiences";
import CampaignSchedulerPage from "./pages/CampaignSchedulerPage";
import ChatsPage from "./pages/ChatsPage";
import CopyAgentPage from "./pages/CopyAgentPage";
import SettingsPage from "./pages/settings/SettingsPage";
import UsersPage from "./pages/settings/UsersPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FinishProfilePage from "./pages/FinishProfilePage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { AdminLayout } from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TenantList from "./pages/admin/TenantList";
import TenantDetails from "./pages/admin/TenantDetails";
import PlansList from "./pages/admin/PlansList";
import EmailTemplatesPage from "./pages/admin/EmailTemplatesPage";
import Obrigado from "./pages/Obrigado";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./components/ui/sidebar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 segundos
      gcTime: 300000, // 5 minutos
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
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/obrigado" element={<Obrigado />} />

              {/* Rotas protegidas que usam o DashboardLayout */}
              <Route element={<ProtectedRoute />}>
                <Route path="/finish-profile" element={<FinishProfilePage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/welcome" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/instancias" element={<Instancias />} />
                  <Route path="/disparo" element={<Disparo />} />
                  <Route path="/audiences" element={<Audiences />} />
                  <Route path="/agendar-campanha" element={<CampaignSchedulerPage />} />
                  <Route path="/copy-agent" element={<CopyAgentPage />} />
                  <Route path="/chats" element={<ChatsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/users" element={<UsersPage />} />
                </Route>
              </Route>

              {/* Rotas de Admin */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="tenants" element={<TenantList />} />
                  <Route path="tenants/:id" element={<TenantDetails />} />
                  <Route path="plans" element={<PlansList />} />
                  <Route path="email-templates" element={<EmailTemplatesPage />} />
                </Route>
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