"use client";

import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/ui/sidebar"; // Assumindo que o sidebar está aqui

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}