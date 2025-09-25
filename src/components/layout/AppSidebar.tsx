"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, LayoutDashboard, Server, Send, Settings, CalendarDays,
  MessageSquare, HardDrive, Link as LinkIcon,
  ChevronLeft, ChevronRight, Sun, Moon
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AppSidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  // Lógica para selecionar a logo com base no estado da sidebar e no tema
  let logoSrc: string;
  if (isSidebarOpen) {
    logoSrc = theme === 'dark' ? '/3.png' : '/2.png'; // Logos completas
  } else {
    logoSrc = theme === 'dark' ? '/icon dark.png' : '/icon white.png'; // Logos de ícone
  }

  const navItems = [
    { name: 'Home', href: '/', icon: Home, type: 'link' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, type: 'link' },
    {
      name: 'Disparo',
      icon: Send,
      type: 'accordion',
      subItems: [
        { name: 'Disparo Pontual', href: '/disparo', icon: MessageSquare },
        { name: 'Agendar Campanha', href: '/agendar-campanha', icon: CalendarDays },
      ],
    },
    {
      name: 'Configurações',
      icon: Settings,
      type: 'accordion',
      subItems: [
        { name: 'Instâncias', href: '/instancias', icon: HardDrive },
        { name: 'API', href: '/api-settings', icon: LinkIcon },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-[72px]", // Largura dinâmica
        "bg-sidebar dark:bg-gray-900 dark:border-r dark:border-gray-800"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Seção do Logo */}
        <div className={cn("p-4 border-b border-border flex items-center", isSidebarOpen ? "justify-center h-28" : "justify-center h-16")}>
          <Link to="/" className="flex items-center justify-center">
            <img
              src={logoSrc}
              alt="DisparaLead Logo"
              className={cn("w-auto transition-all duration-300", isSidebarOpen ? "h-24" : "h-10")} // Altura dinâmica do logo
            />
          </Link>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = item.type === 'link' ? location.pathname === item.href : item.subItems?.some(sub => location.pathname === sub.href);

            if (item.type === 'link') {
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center p-2 rounded-md text-sm font-medium transition-colors",
                    isSidebarOpen ? "justify-start gap-3" : "justify-center",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {isSidebarOpen && <span>{item.name}</span>}
                </Link>
              );
            } else if (item.type === 'accordion' && item.subItems) {
              if (isSidebarOpen) {
                // Renderiza como Accordion quando a sidebar está aberta
                return (
                  <Accordion type="single" collapsible key={item.name} className="w-full">
                    <AccordionItem value={item.name} className="border-none">
                      <AccordionTrigger
                        className={cn(
                          "flex items-center p-2 rounded-md text-sm font-medium transition-colors hover:no-underline",
                          "justify-start gap-3",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "group [&[data-state=open]>svg]:rotate-0" // Seta fixa (não gira)
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                        {/* A seta padrão do AccordionTrigger é renderizada automaticamente pelo componente */}
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="ml-8 space-y-1">
                          {item.subItems.map((subItem) => {
                            const isSubItemActive = location.pathname === subItem.href;
                            return (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors",
                                  isSubItemActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                              >
                                {subItem.icon && <subItem.icon className="h-4 w-4" />}
                                <span>{subItem.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                );
              } else {
                // Renderiza como DropdownMenu quando a sidebar está recolhida
                return (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex items-center p-2 rounded-md text-sm font-medium transition-colors w-full",
                          "justify-center",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.name}</span> {/* Rótulo acessível para leitores de tela */}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      {item.subItems.map((subItem) => {
                        const isSubItemActive = location.pathname === subItem.href;
                        return (
                          <DropdownMenuItem key={subItem.name} asChild>
                            <Link
                              to={subItem.href}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors",
                                isSubItemActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )}
                            >
                              {subItem.icon && <subItem.icon className="h-4 w-4" />}
                              <span>{subItem.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
            }
            return null;
          })}
        </nav>

        {/* Alternador de Tema (apenas ícone clicável) */}
        <div className={cn("p-4 border-t border-border flex items-center", isSidebarOpen ? "justify-between" : "justify-center")}>
          {isSidebarOpen && <span className="text-sm text-sidebar-foreground">Modo Escuro</span>}
          <Button
            variant="ghost"
            size="icon" // Botão pequeno, apenas com ícone
            onClick={toggleTheme}
            className={cn(
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isSidebarOpen && "w-full" // Ocupa a largura total quando recolhido para facilitar o clique
            )}
          >
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="sr-only">Alternar tema</span> {/* Rótulo acessível */}
          </Button>
        </div>

        {/* Botão para encolher/expandir a sidebar */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className={cn(
              "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isSidebarOpen ? "justify-start" : "justify-center"
            )}
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-5 w-5 mr-3" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            {isSidebarOpen && <span>{isSidebarOpen ? 'Encolher Menu' : 'Expandir Menu'}</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};