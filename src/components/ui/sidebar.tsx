"use client";

import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/context/ThemeContext";
import {
  LayoutDashboard,
  Server,
  Send,
  Bell,
  User,
  Sun,
  Moon,
} from "lucide-react";
import * as React from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/instancias", icon: Server, label: "Instâncias" },
  { href: "/disparo", icon: Send, label: "Disparo" },
];

const SidebarContext = React.createContext<{ isCollapsed: boolean }>({ isCollapsed: false });

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  // For simplicity, we'll keep it expanded on desktop for now.
  // This can be extended later with a toggle.
  const [isCollapsed] = React.useState(false);
  return (
    <SidebarContext.Provider value={{ isCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="hidden sm:flex h-full w-64 flex-col border-r bg-card/80 p-4">
      <div className="flex h-16 items-center shrink-0 px-2">
        <NavLink to="/" className="flex items-center gap-2 font-semibold text-lg">
          <Send className="h-6 w-6 text-primary" />
          <span>DisparaLead</span>
        </NavLink>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent hover:text-accent-foreground ${
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span>Notificações</span>
          <Badge className="ml-auto h-4 w-4 justify-center rounded-full p-0 text-xs">3</Badge>
        </Button>
        <Button variant="ghost" onClick={toggleTheme} className="w-full justify-start gap-3 text-muted-foreground">
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          <span>Alternar Tema</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
          <User className="h-5 w-5" />
          <span>Perfil</span>
        </Button>
      </div>
    </aside>
  );
};