"use client";

import { Outlet } from "react-router-dom";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar"; // Importando o SidebarProvider

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}