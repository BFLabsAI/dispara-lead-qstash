"use client";

import { Outlet } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar"; // Mantemos o useSidebar para controlar a margem do conteúdo principal
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppSidebar } from "./AppSidebar"; // Importa o novo AppSidebar

export function DashboardLayout() {
  const { isSidebarOpen } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen w-full overflow-hidden">
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
  );
}