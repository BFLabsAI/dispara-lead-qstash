"use client";

import { Outlet } from "react-router-dom";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}