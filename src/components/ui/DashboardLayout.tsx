"use client";

import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Server,
  Send,
  ChevronLeft,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/instancias", icon: Server, label: "Instâncias" },
  { href: "/disparo", icon: Send, label: "Novo Disparo" },
];

export const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-center h-20">
        <h1 className={cn("text-2xl font-bold gradient-text", isCollapsed && "text-center text-3xl")}>
          {isCollapsed ? "D" : "DisparaLead"}
        </h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                isActive && "gradient-primary text-white dark:text-white font-semibold shadow-md",
                isCollapsed && "justify-center"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-2 border-t border-border space-y-2">
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          className="w-full flex items-center gap-3 justify-center md:justify-start"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {!isCollapsed && <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>}
        </Button>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          className="w-full hidden md:flex items-center gap-3 justify-center md:justify-start"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span>Esconder</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/40 dark:bg-background">
      <aside
        className={cn(
          "hidden md:flex flex-col bg-background border-r transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
      <div className="flex flex-col flex-1">
        <header className="flex md:hidden items-center h-14 px-4 border-b bg-background sticky top-0 z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <div className="flex-1 text-center">
             <h1 className="text-xl font-bold gradient-text">DisparaLead</h1>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};