"use client";

import { Outlet } from "react-router-dom";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <Sidebar />
        <main className="flex-1 p-4 pt-20 sm:p-6 lg:p-8 md:pt-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}