"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom'; // Importar useLocation para destacar o item ativo
import {
  Home, LayoutDashboard, Server, Send, Settings, CalendarDays, // Ícones para itens principais
  MessageSquare, HardDrive, Link as LinkIcon, // Ícones para sub-menus
  ChevronLeft, ChevronRight // Ícones para o botão de toggle da sidebar
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button"; // Importar Button para o toggle da sidebar

export const AppSidebar = () => {
  const { theme } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar(); // Obter toggleSidebar
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
        { name: 'Disparo Pontual', href: '/disparo', icon: MessageSquare }, // Ícone adicionado
        { name: 'Agendar Campanha', href: '/agendar-campanha', icon: CalendarDays }, // Ícone adicionado
      ],
    },
    {
      name: 'Configurações',
      icon: Settings,
      type: 'accordion',
      subItems: [
        { name: 'Instâncias', href: '/instancias', icon: HardDrive }, // Ícone adicionado
        { name: 'API', href: '/api-settings', icon: LinkIcon }, // Ícone adicionado
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "dark:bg-gray-900 dark:border-r dark:border-gray-800"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Seção do Logo */}
        <div className="p-4 border-b border-border flex items-center justify-center h-28">
          <Link to="/" className="flex items-center justify-center">
            <img
              src={logoSrc}
              alt="DisparaLead Logo"
              className="h-24 w-auto transition-opacity duration-300"
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
                      "flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              } else if (item.type === 'accordion' && item.subItems) {
                const isAnySubItemActive = item.subItems.some(sub => location.pathname === sub.href);
                return (
                  <AccordionItem key={item.name} value={item.name} className="border-none">
                    <AccordionTrigger
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors hover:no-underline",
                        isAnySubItemActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        // Sobrescreve estilos padrão do shadcn/ui para alinhar à esquerda e fixar a seta
                        "justify-start [&[data-state=open]>svg]:rotate-0"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                      {/* A seta padrão do AccordionTrigger é renderizada, mas sua rotação é desativada acima */}
                    </AccordionTrigger>
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
                              {subItem.icon && <subItem.icon className="h-4 w-4" />} {/* Renderiza o ícone do sub-item */}
                              <span>{subItem.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }
              return null;
            })}
          </Accordion>
        </nav>

        {/* Botão para encolher/expandir a sidebar */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-5 w-5 mr-3" />
            ) : (
              <ChevronRight className="h-5 w-5 mr-3" />
            )}
            <span>{isSidebarOpen ? 'Encolher Menu' : 'Expandir Menu'}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};