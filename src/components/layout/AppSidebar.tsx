"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom'; // Importar useLocation para destacar o item ativo
import { Home, LayoutDashboard, Server, Send, Settings, CalendarDays } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Importar componentes do Accordion

export const AppSidebar = () => {
  const { theme } = useTheme();
  const { isSidebarOpen } = useSidebar();
  const location = useLocation(); // Hook para obter a rota atual

  const logoSrc = theme === 'dark' ? '/3.png' : '/2.png';

  const navItems = [
    { name: 'Home', href: '/', icon: Home, type: 'link' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, type: 'link' },
    {
      name: 'Disparo',
      icon: Send,
      type: 'accordion',
      subItems: [
        { name: 'Disparo Pontual', href: '/disparo' },
        { name: 'Agendar Campanha', href: '/agendar-campanha' },
      ],
    },
    {
      name: 'Configurações',
      icon: Settings,
      type: 'accordion',
      subItems: [
        { name: 'Instâncias', href: '/instancias' },
        { name: 'API', href: '/api-settings' },
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
        <div className="p-4 border-b border-border flex items-center justify-center h-28"> {/* Aumentado para h-28 para acomodar a logo maior */}
          <Link to="/" className="flex items-center justify-center">
            <img
              src={logoSrc}
              alt="DisparaLead Logo"
              className="h-24 w-auto transition-opacity duration-300" // Logo 3x maior (h-8 * 3 = h-24)
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
                // Verifica se algum sub-item está ativo para manter o accordion aberto
                const isAnySubItemActive = item.subItems.some(sub => location.pathname === sub.href);
                return (
                  <AccordionItem key={item.name} value={item.name} className="border-none">
                    <AccordionTrigger
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors hover:no-underline",
                        isAnySubItemActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
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
                              {/* Sem ícone para sub-itens, ou você pode adicionar um pequeno ponto/traço */}
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
      </div>
    </aside>
  );
};