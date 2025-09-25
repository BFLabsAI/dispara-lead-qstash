"use client";

import { Outlet } from "react-router-dom";
import { Sidebar, useSidebar } from "@/components/ui/sidebar"; // Importar useSidebar
import { cn } from "@/lib/utils"; // Importar cn para classes condicionais
import { useIsMobile } from "@/hooks/use-mobile"; // Importar useIsMobile

export function DashboardLayout() {
  const { isSidebarOpen } = useSidebar(); // Obter o estado da sidebar
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main
        className={cn(
          "flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto transition-all duration-300 ease-in-out",
          !isMobile && isSidebarOpen ? "ml-64" : "ml-0" // Ajustar margem para desktop
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}