"use client";

import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDown, Menu, X, LayoutDashboard, Server, Send, Settings } from "lucide-react"; // Adicionado LayoutDashboard, Server, Send, Settings
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/context/ThemeContext";

// Context for sidebar state
interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(true); // Sidebar open by default on desktop
    } else {
      setIsSidebarOpen(false); // Closed by default on mobile
    }
  }, [isMobile]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// SidebarLink component for non-collapsible items
interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  className?: string;
}

export const SidebarLink = ({ to, icon: Icon, label, className }: SidebarLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  const handleClick = () => {
    if (isMobile) {
      toggleSidebar();
    }
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
        className
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
};

// SidebarCollapsibleItem for expandable sections
interface SidebarCollapsibleItemProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const SidebarCollapsibleItem = ({ icon: Icon, label, children, defaultOpen = false }: SidebarCollapsibleItemProps) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="grid gap-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center justify-between w-full px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            {label}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="grid gap-2 pl-8">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Main Sidebar component
export const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-card dark:bg-card-foreground text-foreground"
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar transition-transform duration-300 ease-in-out",
          !isSidebarOpen && "-translate-x-full",
          isMobile && "shadow-lg",
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl text-primary">
            {/* Assuming logo.svg exists, otherwise use text */}
            {/* <img src="/logo.svg" alt="DisparaLead Logo" className="h-8 w-auto" /> */}
            DisparaLead
          </Link>
        </div>
        <nav className="flex-1 overflow-auto px-4 py-6">
          <ul className="grid gap-2">
            <li>
              <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            </li>
            <SidebarCollapsibleItem icon={Server} label="Instâncias" defaultOpen={true}> {/* Default open para Instâncias */}
              <SidebarLink to="/instancias" icon={Server} label="Gerenciar Instâncias" />
              <SidebarLink to="/api-settings" icon={Settings} label="Configurações da API" />
            </SidebarCollapsibleItem>
            <SidebarCollapsibleItem icon={Send} label="Campanhas">
              <SidebarLink to="/disparo" icon={Send} label="Novo Disparo" />
              {/* Add other campaign related links here if any */}
            </SidebarCollapsibleItem>
          </ul>
        </nav>
        <div className="mt-auto p-4 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <i className="fas fa-sun mr-2 h-4 w-4" />
            ) : (
              <i className="fas fa-moon mr-2 h-4 w-4" />
            )}
            Alternar Tema
          </Button>
        </div>
      </aside>
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={toggleSidebar}></div>
      )}
    </>
  );
};