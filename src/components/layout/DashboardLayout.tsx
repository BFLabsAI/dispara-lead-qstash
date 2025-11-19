"use client";

import { Outlet } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar"; // Mantemos o useSidebar para controlar a margem do conteúdo principal
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppSidebar } from "./AppSidebar"; // Importa o novo AppSidebar

import { useNavigate } from "react-router-dom";
import { useAdminStore } from "@/store/adminStore";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function DashboardLayout() {
  const { isSidebarOpen } = useSidebar();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { impersonatedTenantId, setImpersonatedTenantId, adminTenantId } = useAdminStore();

  const handleExitImpersonation = () => {
    // When exiting, set back to adminTenantId instead of null
    if (adminTenantId) {
      setImpersonatedTenantId(adminTenantId);
    } else {
      setImpersonatedTenantId(null);
    }
    navigate('/admin/tenants');
  };

  const isImpersonating = impersonatedTenantId && adminTenantId && impersonatedTenantId !== adminTenantId;

  return (
    <div className="flex h-screen w-full overflow-hidden flex-col">
      {isImpersonating && (
        <div className="bg-amber-500 text-white px-4 py-2 flex justify-between items-center z-50">
          <span className="font-medium">Você está acessando o painel de um cliente (Modo de Acesso)</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExitImpersonation}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair do Acesso
          </Button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar /> {/* Usamos o novo AppSidebar aqui */}
        <main
          className={cn(
            "flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto transition-all duration-300 ease-in-out",
            // Em desktop, ajusta a margem esquerda com base no estado da sidebar
            !isMobile ? (isSidebarOpen ? "ml-64" : "ml-[72px]") : "ml-0",
            // Em mobile, a sidebar se sobrepõe, então o conteúdo principal não precisa de margem.
            // A própria sidebar lida com seu -translate-x-full quando fechada em mobile.
          )}
        >
          {/* Envolve o conteúdo do Outlet para aplicar max-width e auto-margins para centralização */}
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}