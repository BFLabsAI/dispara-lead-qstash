"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar'; // Importa o hook para controlar o estado da sidebar
import { cn } from '@/lib/utils'; // Para classes condicionais
import { Link } from 'react-router-dom'; // Para links de navegação
import { Home, LayoutDashboard, Server, Send, Settings, CalendarDays } from 'lucide-react'; // Ícones para os itens do menu

export const AppSidebar = () => {
  const { theme } = useTheme();
  const { isSidebarOpen } = useSidebar();

  // Define a fonte da imagem do logo com base no tema atual
  const logoSrc = theme === 'dark' ? '/3.png' : '/2.png';

  // Itens de navegação da sidebar (replicando as rotas existentes)
  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Instâncias', href: '/instancias', icon: Server },
    { name: 'Disparo', href: '/disparo', icon: Send },
    { name: 'Agendar Campanha', href: '/agendar-campanha', icon: CalendarDays },
    { name: 'Configurações API', href: '/api-settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "dark:bg-gray-900 dark:border-r dark:border-gray-800" // Estilos para o modo escuro
      )}
    >
      <div className="flex flex-col h-full">
        {/* Seção do Logo */}
        <div className="p-4 border-b border-border flex items-center justify-center h-16"> {/* Altura fixa para o cabeçalho */}
          <Link to="/" className="flex items-center justify-center">
            <img
              src={logoSrc}
              alt="DisparaLead Logo"
              className="h-8 w-auto transition-opacity duration-300" // Tamanho do logo
            />
          </Link>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex items-center gap-3 p-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Você pode adicionar outros elementos aqui, como um rodapé da sidebar */}
      </div>
    </aside>
  );
};