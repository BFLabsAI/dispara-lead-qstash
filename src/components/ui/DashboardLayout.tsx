"use client";

import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Bell, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const location = useLocation();
  const [notifications] = React.useState(3); // Static example; replace with real state if needed

  // Dynamic titles based on route - customize as needed
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") {
      return { title: "Dashboard", subtitle: "Analytics e insights em tempo real" };
    } else if (path === "/instancias") {
      return { title: "Instâncias", subtitle: "Gerencie suas conexões WhatsApp" };
    } else if (path === "/disparo") {
      return { title: "Disparo", subtitle: "Configure envios de mensagens" };
    }
    return { title: "Painel", subtitle: "Bem-vindo ao DisparaLead" };
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Sticky top header - unchanged */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 logoxa:hidden">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex flex-1 items-center justify-between gap-2">
          {/* Optional search or logo here */}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="glass-card text-muted-foreground hover:text-foreground">
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
          <Button variant="ghost" size="sm" className="glass-card text-muted-foreground hover:text-foreground">
            <Sun className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="glass-card text-muted-foreground hover:text-foreground">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Wrap main content with SidebarProvider to fix useSidebar error */}
      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden">
          <SidebarInset>
            <div className="mx-auto w-full max-w-screen-2xl flex-1 overflow-auto p-4 md:p-6 lg:p-8">
              {/* Green gradient header - exactly the section you specified */}
              <div className="mb-8 p-6 rounded-2xl shadow-xl gradient-primary text-white"> {/* gradient-primary for green bg, text-white for contrast, rounded/shadow to match theme */}
                <div className="flex items-center justify-between"> {/* Your exact flex div */}
                  <div className="space-y-1 flex-1"> {/* Title/subtitle container */}
                    <h1 className="text-4xl font-bold text-white"> {/* White text on green */}
                      {title}
                    </h1>
                    <p className="text-lg text-white/90"> {/* Semi-transparent white for subtitle */}
                      {subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0"> {/* Buttons container - unchanged structure */}
                    <Button variant="ghost" size="sm" className="glass-card text-white/90 hover:bg-white/10 hover:text-white border-white/20 h-10 p-3 rounded-xl"> {/* White text/hover for green bg */}
                      <Bell className="h-5 w-5 mr-2" />
                      {notifications > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-red-500 text-white border-red-500 absolute -top-1 -right-1"
                        >
                          {notifications}
                        </Badge>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" className="glass-card text-white/90 hover:bg-white/10 hover:text-white border-white/20 h-10 w-10 p-0 rounded-xl"> {/* Icon button adjustments */}
                      <Sun className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="glass-card text-white/90 hover:bg-white/10 hover:text-white border-white/20 h-10 w-10 p-0 rounded-xl">
                      <User className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Page content outlet - unchanged */}
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}