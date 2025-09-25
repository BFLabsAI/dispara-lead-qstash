"use client";

import { useLocation } from "react-router-dom";
import { Bell, User, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/context/ThemeContext";
import { useMemo } from "react";

const pageInfo: { [key: string]: { title: string; subtitle: string } } = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Analytics e insights em tempo real",
  },
  "/instancias": {
    title: "Instâncias",
    subtitle: "Gerencie suas conexões do WhatsApp",
  },
  "/disparo": {
    title: "Disparo em Massa",
    subtitle: "Configure e envie suas campanhas",
  },
};

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const currentInfo = useMemo(() => {
    return pageInfo[location.pathname] || { title: "Página", subtitle: "Bem-vindo" };
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold truncate">{currentInfo.title}</h1>
        <p className="text-sm text-muted-foreground truncate">
          {currentInfo.subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <Badge className="absolute right-1 top-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
            3
          </Badge>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}