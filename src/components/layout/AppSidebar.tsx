"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, LayoutDashboard, Server, Send, Settings, CalendarDays,
  MessageSquare, HardDrive, Link as LinkIcon,
  ChevronLeft, ChevronRight, Sun, Moon // Adicionado Sun e Moon para o alternador de tema
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Importar Switch para o alternador de tema
import { Label } from "@/components/ui/label"; // Importar Label para acessibilidade do Switch

export const AppSidebar = () => {
  const { theme, toggleTheme } = useTheme(); // Obter toggleTheme do contexto
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  const logoSrc = theme === 'dark' ? '/3.png' : '/2.png';

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
        isSidebarOpen ? "w-64" : "w-[72px]", // Largura dinâmica: 64 (aberto) ou 72px (encolhido)
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
          <Accordion type="multiple" className="w-full">
            {navItems.map((item) => {
              if (item.type === 'link') {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center p-2 rounded-md text-sm font-medium transition-colors",
                      isSidebarOpen ? "justify-start gap-3" : "justify-center", // Alinha ao centro quando encolhido
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {isSidebarOpen && <span>{item.name}</span>} {/* Renderiza texto apenas se sidebar estiver aberta */}
                  </Link>
                );
              } else if (item.type === 'accordion' && item.subItems) {
                const isAnySubItemActive = item.subItems.some(sub => location.pathname === sub.href);
                return (
                  <AccordionItem key={item.name} value={item.name} className="border-none">
                    <AccordionTrigger
                      className={cn(
                        "flex items-center p-2 rounded-md text-sm font-medium transition-colors hover:no-underline",
                        isSidebarOpen ? "justify-start gap-3" : "justify-center", // Alinha ao centro quando encolhido
                        isAnySubItemActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        // Sobrescreve estilos padrão do shadcn/ui para alinhar à esquerda e fixar a seta
                        "group [&[data-state=open]>svg]:rotate-0" // Seta fixa (não gira)
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {isSidebarOpen && <span>{item.name}</span>} {/* Renderiza texto apenas se sidebar estiver aberta */}
                      {isSidebarOpen && ( // Renderiza a seta apenas se sidebar estiver aberta
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 ml-auto" /> // Seta padrão do AccordionTrigger
                      )}
                    </AccordionTrigger>
                    {isSidebarOpen && ( // Renderiza AccordionContent apenas se sidebar estiver aberta
                      <AccordionContent className="pb-0">
                        <div className="ml-8 space-y-1">
                          {item.subItems.map((subItem) => {
                            const isActive = location.pathname === subItem.href;
                            return (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors",
                                  isActive
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
                    )}
                  </AccordionItem>
                );
              }
              return null;
            })}
          </Accordion>
        </nav>

        {/* Alternador de Tema */}
        <div className={cn("p-4 border-t border-border flex items-center", isSidebarOpen ? "justify-between" : "justify-center")}>
          {isSidebarOpen && <span className="text-sm text-sidebar-foreground">Modo Escuro</span>}
          <div className={cn("flex items-center", isSidebarOpen ? "gap-2" : "")}>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={() => toggleTheme()}
              id="theme-toggle"
            />
            <Label htmlFor="theme-toggle" className="sr-only">Alternar tema</Label> {/* Para acessibilidade */}
            {theme === 'dark' ? <Moon className="h-5 w-5 text-sidebar-foreground" /> : <Sun className="h-5 w-5 text-sidebar-foreground" />}
          </div>
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
              <ChevronRight className="h-5 w-5" /> // Sem margem à direita quando encolhido
            )}
            {isSidebarOpen && <span>{isSidebarOpen ? 'Encolher Menu' : 'Expandir Menu'}</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};