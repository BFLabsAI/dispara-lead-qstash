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
          !isMobile && isSidebarOpen ? "ml-64" : "ml-0", // Ajustar margem para desktop
          "max-w-7xl mx-auto" // Adicionado para limitar a largura e centralizar o conteúdo
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}