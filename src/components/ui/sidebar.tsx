"use client";

import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cva } from "class-variance-authority";
import {
  ChevronLeft,
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
import { useTheme } from "@/context/ThemeContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// --- Contexto ---
interface SidebarContextProps {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined
);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
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

// --- Componentes ---
const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/instancias", icon: Server, label: "Instâncias" },
  { href: "/disparo", icon: Rocket, label: "Disparo" },
];

export function Sidebar() {
  const isMobile = useIsMobile();
  const { isCollapsed } = useSidebar();

  if (isMobile) return <MobileSidebar />;

  return (
    <aside
      className={cn(
        "relative hidden h-screen flex-col bg-card transition-all duration-300 ease-in-out md:flex",
        isCollapsed ? "w-24" : "w-72"
      )}
    >
      <div className="flex h-16 items-center px-6">
        <Rocket className="h-7 w-7 text-primary" />
        <h1 className={cn("ml-3 text-xl font-bold overflow-hidden whitespace-nowrap transition-opacity", isCollapsed && "opacity-0 w-0")}>
          DisparaLead
        </h1>
      </div>
      <nav className="flex flex-1 flex-col gap-2 p-4">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 p-4">
        <ThemeToggle />
        <CollapseButton />
      </div>
    </aside>
  );
}

function MobileSidebar() {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50 md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col bg-card p-0">
        <div className="flex h-16 items-center px-6">
          <Rocket className="h-7 w-7 text-primary" />
          <h1 className="ml-3 text-xl font-bold">DisparaLead</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-2 p-4">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} onClick={() => setIsOpen(false)} />
          ))}
        </nav>
        <div className="mt-auto border-t p-4">
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}

const navLinkVariants = cva(
  "flex items-center gap-4 rounded-lg px-4 py-3 text-base font-semibold transition-colors",
  {
    variants: {
      state: {
        default: "text-muted-foreground hover:bg-primary/10 hover:text-primary",
        active: "gradient-primary text-white shadow-lg btn-premium",
      },
    },
    defaultVariants: { state: "default" },
  }
);

function NavItem({ href, icon: Icon, label, onClick }: any) {
  const { isCollapsed } = useSidebar();
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink to={href} onClick={onClick} className={navLinkVariants({ state: isActive ? "active" : "default" })}>
      <Icon className="h-6 w-6" />
      <span className={cn("overflow-hidden whitespace-nowrap", isCollapsed && "hidden")}>{label}</span>
    </NavLink>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed } = useSidebar();
  return (
    <Button variant="ghost" onClick={toggleTheme} className={cn("w-full justify-start gap-4 rounded-lg px-4 py-3 text-base font-semibold text-muted-foreground", isCollapsed && "justify-center")}>
      {theme === "light" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      <span className={cn(isCollapsed && "hidden")}>Modo {theme === 'light' ? 'Claro' : 'Escuro'}</span>
    </Button>
  );
}

function CollapseButton() {
  const { isCollapsed, setCollapsed } = useSidebar();
  return (
    <Button variant="ghost" onClick={() => setCollapsed(!isCollapsed)} className="w-full justify-start gap-4 rounded-lg px-4 py-3 text-base font-semibold text-muted-foreground">
      <ChevronLeft className={cn("h-6 w-6 transition-transform", isCollapsed && "rotate-180")} />
      <span className={cn(isCollapsed && "hidden")}>Esconder</span>
    </Button>
  );
}