"use client";

import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/context/ThemeContext";
import {
  Bell,
  User,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as React from "react";

// Usando Font Awesome para os ícones de navegação, como no design original
const navItems = [
  { href: "/dashboard", iconClass: "fa-solid fa-table-cells-large", label: "Dashboard" },
  { href: "/instancias", iconClass: "fa-solid fa-server", label: "Instâncias" },
  { href: "/disparo", iconClass: "fa-solid fa-rocket", label: "Disparo" },
];

const SidebarContext = React.createContext<{ isCollapsed: boolean; toggleSidebar: () => void }>({
  isCollapsed: false,
  toggleSidebar: () => {},
});

export const useSidebar = () => React.useContext(SidebarContext);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const toggleSidebar = () => setIsCollapsed(prev => !prev);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside className={`hidden sm:flex h-full flex-col border-r bg-card/80 p-4 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex h-16 items-center shrink-0 px-2">
        <NavLink to="/" className="flex items-center gap-2 font-semibold text-lg">
          <i className="fa-solid fa-rocket h-6 w-6 text-primary flex items-center justify-center"></i>
          {!isCollapsed && <span>DisparaLead</span>}
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
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <i className={`${item.iconClass} h-5 w-5 flex items-center justify-center`}></i>
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-2">
        <Button variant="ghost" className={`w-full justify-start gap-3 text-muted-foreground ${isCollapsed ? 'justify-center' : ''}`}>
          <Bell className="h-5 w-5" />
          {!isCollapsed && <span>Notificações</span>}
          {!isCollapsed && <Badge className="ml-auto h-4 w-4 justify-center rounded-full p-0 text-xs">3</Badge>}
        </Button>
        <Button variant="ghost" onClick={toggleTheme} className={`w-full justify-start gap-3 text-muted-foreground ${isCollapsed ? 'justify-center' : ''}`}>
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {!isCollapsed && <span>Alternar Tema</span>}
        </Button>
        <Button variant="ghost" className={`w-full justify-start gap-3 text-muted-foreground ${isCollapsed ? 'justify-center' : ''}`}>
          <User className="h-5 w-5" />
          {!isCollapsed && <span>Perfil</span>}
        </Button>
      </div>
      <div className="border-t pt-4 mt-4">
        <Button variant="ghost" onClick={toggleSidebar} className="w-full justify-center text-muted-foreground">
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  );
};