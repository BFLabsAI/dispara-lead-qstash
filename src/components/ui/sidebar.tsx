"use client";

import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cva } from "class-variance-authority";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Server,
  Rocket,
  Moon,
  Sun,
  Menu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/context/ThemeContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// --- Contexto para o Estado do Sidebar ---
interface SidebarContextProps {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined
);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar deve ser usado dentro de um SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setCollapsed] = React.useState(false);
  return (
    <SidebarContext.Provider value={{ isCollapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

// --- Componente Principal do Sidebar ---
const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/instancias",
    icon: Server,
    label: "Instâncias",
  },
  {
    href: "/disparo",
    icon: Rocket,
    label: "Disparo",
  },
];

export function Sidebar() {
  const isMobile = useIsMobile();
  const { isCollapsed, setCollapsed } = useSidebar();

  if (isMobile) {
    return <MobileSidebar />;
  }

  return (
    <aside
      className={cn(
        "relative hidden h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out md:flex",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <div
          className={cn(
            "flex items-center gap-2 overflow-hidden whitespace-nowrap transition-opacity",
            isCollapsed && "opacity-0"
          )}
        >
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">DisparaLead</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!isCollapsed)}
          className="absolute -right-5 top-6 z-10 rounded-full border bg-background hover:bg-accent"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-2 p-2">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>
      <div className="mt-auto border-t p-2">
        <ThemeToggle isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}

// --- Sidebar para Mobile ---
function MobileSidebar() {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50 md:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <div className="flex h-16 items-center border-b px-4">
            <Rocket className="h-6 w-6 text-primary" />
            <h1 className="ml-2 text-lg font-bold">DisparaLead</h1>
          </div>
          <nav className="flex flex-1 flex-col gap-2 p-2">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isCollapsed={false}
                onClick={() => setIsOpen(false)}
              />
            ))}
          </nav>
          <div className="mt-auto border-t p-2">
            <ThemeToggle isCollapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// --- Item de Navegação ---
const navLinkVariants = cva(
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      state: {
        default: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      collapsed: {
        true: "justify-center",
        false: "",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

function NavItem({ href, icon: Icon, label, isCollapsed, onClick }: any) {
  const location = useLocation();
  const isActive = location.pathname === href;

  const linkContent = (
    <>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className={cn("truncate", isCollapsed && "hidden")}>{label}</span>
    </>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <NavLink
            to={href}
            onClick={onClick}
            className={navLinkVariants({
              state: isActive ? "active" : "default",
              collapsed: true,
            })}
          >
            {linkContent}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={href}
      onClick={onClick}
      className={navLinkVariants({
        state: isActive ? "active" : "default",
      })}
    >
      {linkContent}
    </NavLink>
  );
}

// --- Botão de Tema ---
function ThemeToggle({ isCollapsed }: { isCollapsed: boolean }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={isCollapsed ? "icon" : "default"}
      onClick={toggleTheme}
      className={cn(!isCollapsed && "w-full justify-start gap-3")}
    >
      {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className={cn(isCollapsed && "hidden")}>
        {theme === "light" ? "Modo Claro" : "Modo Escuro"}
      </span>
    </Button>
  );
}