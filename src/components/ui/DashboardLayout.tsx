"use client";

import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const location = useLocation();
  const [notifications] = React.useState(3); // Example state for badge

  // Dynamic title and subtitle based on route (customize as needed)
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
      case "/dashboard":
        return { title: "Dashboard", subtitle: "Analytics e insights em tempo real" };
      case "/instancias":
        return { title: "Instâncias", subtitle: "Gerencie suas conexões WhatsApp" };
      case "/disparo":
        return { title: "Disparo", subtitle: "Configure envios de mensagens" };
      default:
        return { title: "Página", subtitle: "Bem-vindo ao painel" };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 logoxa:hidden">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex flex-1 items-center justify-between gap-2">
          {/* Search bar or other elements can go here if needed */}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="glass-card">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 w-5 rounded-full p-0 text-xs absolute -top-1 -right-1"
              >
                {notifications}
              </Badge>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="glass-card">
            <Sun className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="glass-card">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content area with green gradient header section */}
      <div className="flex flex-1 overflow-hidden">
        <SidebarInset>
          <div className="mx-auto w-full max-w-screen-2xl flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {/* Green gradient header section - applied here for the main session */}
            <div className="mb-8 rounded-lg p-6 gradient-primary text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold">{title}</h1>
                  <p className="text-lg text-white/80">{subtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Buttons adjusted for green background - keep glass-card for subtle transparency */}
                  <Button variant="ghost" size="sm" className="glass-card text-white hover:bg-white/10 hover:text-white border-white/20">
                    <Bell className="h-5 w-5 mr-2" />
                    Notificações
                    {notifications > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-red-500 border-red-500"
                      >
                        {notifications}
                      </Badge>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" className="glass-card text-white hover:bg-white/10 hover:text-white border-white/20 w-10 h-10 p-0 rounded-xl">
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="glass-card text-white hover:bg-white/10 hover:text-white border-white/20 w-10 h-10 p-0 rounded-xl">
                    <User className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Outlet for page content */}
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </div>
  );
}