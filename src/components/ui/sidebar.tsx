"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Server,
  Send,
  Settings,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Calendar as CalendarIcon, // Importar CalendarIcon
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Contexto para controlar o estado da sidebar
interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(!isMobile); // Aberta por padrão no desktop, fechada no mobile

  React.useEffect(() => {
    setIsSidebarOpen(!isMobile); // Ajusta ao mudar de mobile para desktop
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};


const navItems = [
  {
    label: "Principal",
    items: [
      {
        label: "Home",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      {
        label: "Instâncias",
        href: "/instancias",
        icon: Server,
      },
      {
        label: "Campanhas",
        icon: Send,
        items: [
          {
            label: "Disparo Único",
            href: "/disparo",
            icon: Send,
          },
          {
            label: "Agendar Campanha", // Novo link
            href: "/agendar-campanha",
            icon: CalendarIcon, // Usar CalendarIcon para agendamento
          },
        ],
      },
      {
        label: "Configurações",
        href: "/api-settings",
        icon: Settings,
      },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <>
      {/* Overlay para mobile quando sidebar está aberta */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r bg-sidebar transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto" // Sempre visível no desktop
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/logo.svg" alt="DisparaLead Logo" className="h-8 w-auto" />
            <span className="text-lg text-sidebar-foreground">DisparaLead</span>
          </Link>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <ChevronLeft className="h-5 w-5 text-sidebar-foreground" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="grid items-start gap-2 px-4 text-sm font-medium lg:px-6">
            {navItems.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-4">
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-sidebar-foreground/60">
                  {section.label}
                </h3>
                {section.items.map((item, itemIndex) => (
                  item.items ? ( // Se for um item com sub-itens (colapsável)
                    <div key={itemIndex} className="space-y-1">
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary",
                          location.pathname.startsWith(item.href || "") && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                        onClick={() => { /* Lógica para expandir/colapsar, se necessário */ }}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                      </button>
                      <div className="ml-4 border-l border-sidebar-border pl-4 space-y-1">
                        {item.items.map((subItem, subItemIndex) => (
                          <Link
                            key={subItemIndex}
                            to={subItem.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary",
                              location.pathname === subItem.href && "bg-sidebar-accent text-sidebar-accent-foreground"
                            )}
                            onClick={isMobile ? toggleSidebar : undefined}
                          >
                            <subItem.icon className="h-4 w-4" />
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : ( // Item normal
                    <Link
                      key={itemIndex}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary",
                        location.pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                      onClick={isMobile ? toggleSidebar : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>
        <div className="mt-auto border-t p-4 lg:p-6 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-sidebar-foreground hover:text-sidebar-primary">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <span className="text-xs text-sidebar-foreground/60">v1.0.0</span>
        </div>
      </aside>

      {/* Botão para abrir/fechar sidebar no mobile */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "fixed top-4 left-4 z-50 bg-card shadow-md",
            isSidebarOpen && "hidden"
          )}
          onClick={toggleSidebar}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}