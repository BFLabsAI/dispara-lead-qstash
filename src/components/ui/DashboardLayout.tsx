"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BarChart3,
  Send,
  Server,
  Menu,
  Home,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Instâncias", href: "/instancias", icon: Server },
  { name: "Disparo", href: "/disparo", icon: Send },
];

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        className={cn(
          "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
          isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 font-semibold"
            : "text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-gray-300 dark:hover:bg-green-900/20 dark:hover:text-green-300"
        )}
        onClick={() => setSidebarOpen(false)}
        style={{
          backgroundColor: isActive ? (theme === 'dark' ? 'hsl(145, 63%, 20%)' : 'hsl(138, 76%, 92%)') : undefined,
          color: isActive ? (theme === 'dark' ? 'hsl(140, 79%, 73%)' : 'hsl(146, 63%, 24%)') : undefined,
        }}
      >
        <item.icon
          className={cn(
            "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200",
            isActive
              ? "text-green-600 dark:text-green-400"
              : "text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400"
          )}
          style={{
            color: isActive ? 'hsl(var(--primary))' : undefined,
          }}
        />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                DisparaLead
              </h1>
            </div>
            <div className="mt-8 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
              <div className="px-2 mt-6">
                <Button
                  variant="ghost"
                  onClick={toggleTheme}
                  className="w-full justify-start text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-gray-300 dark:hover:bg-green-900/20 dark:hover:text-green-300 transition-all duration-200"
                  style={{
                    backgroundColor: 'transparent',
                  }}
                >
                  {theme === "dark" ? (
                    <Sun className="mr-3 h-5 w-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                  ) : (
                    <Moon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                  )}
                  Tema {theme === "dark" ? "Claro" : "Escuro"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="lg:hidden fixed top-4 left-4 z-40"
            size="icon"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full pt-5 pb-4">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                DisparaLead
              </h1>
            </div>
            <div className="mt-8 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
              <div className="px-2 mt-6">
                <Button
                  variant="ghost"
                  onClick={toggleTheme}
                  className="w-full justify-start text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-gray-300 dark:hover:bg-green-900/20 dark:hover:text-green-300 transition-all duration-200"
                >
                  {theme === "dark" ? (
                    <Sun className="mr-3 h-5 w-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                  ) : (
                    <Moon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                  )}
                  Tema {theme === "dark" ? "Claro" : "Escuro"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}