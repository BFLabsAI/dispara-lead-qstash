"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, LayoutDashboard, Server, Send, Settings, CalendarDays,
  MessageSquare, HardDrive, Link as LinkIcon, Bot,
  ChevronLeft, ChevronRight, Sun, Moon, Building, Users
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
import { useAdminStore } from "@/store/adminStore";
import { supabase } from "@/services/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AppSidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const impersonatedTenantId = useAdminStore((state) => state.impersonatedTenantId);
  const setImpersonatedTenantId = useAdminStore((state) => state.setImpersonatedTenantId);
  const setAdminTenantId = useAdminStore((state) => state.setAdminTenantId);
  const adminTenantId = useAdminStore((state) => state.adminTenantId);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [adminTenant, setAdminTenant] = useState<any>(null);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  // Initialize impersonatedTenantId to adminTenantId if null (to prevent showing ALL data)
  useEffect(() => {
    if (isSuperAdmin && adminTenantId && !impersonatedTenantId) {
      setImpersonatedTenantId(adminTenantId);
    }
  }, [isSuperAdmin, adminTenantId, impersonatedTenantId]);

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.rpc('is_super_admin');
    if (data) {
      setIsSuperAdmin(true);
      fetchTenants();
      fetchAdminTenant(user.id);
    }
  };

  const fetchAdminTenant = async (userId: string) => {
    const { data } = await supabase
      .from('users_dispara_lead_saas_02')
      .select('tenant_id, tenants_dispara_lead_saas_02(name)')
      .eq('id', userId)
      .single();

    if (data && data.tenants_dispara_lead_saas_02) {
      const tenantId = data.tenant_id;
      setAdminTenant({
        id: tenantId,
        name: (data.tenants_dispara_lead_saas_02 as any).name
      });
      setAdminTenantId(tenantId);

      // If no impersonation is set, default to own tenant
      if (!impersonatedTenantId) {
        setImpersonatedTenantId(tenantId);
      }
    }
  };

  const fetchTenants = async () => {
    const { data } = await supabase.from('tenants_dispara_lead_saas_02').select('id, name, slug');
    setTenants(data || []);
  };

  const handleTenantChange = (value: string) => {
    if (value === 'all') {
      // When selecting "Minha Conta", set to adminTenantId instead of null
      // This ensures we filter by the admin's tenant ID and don't show ALL data
      if (adminTenantId) {
        setImpersonatedTenantId(adminTenantId);
      }
    } else {
      setImpersonatedTenantId(value);
    }
  };

  // ... (logo logic)
  let logoSrc: string;
  if (isSidebarOpen) {
    logoSrc = theme === 'dark' ? '/3.png' : '/2.png';
  } else {
    logoSrc = theme === 'dark' ? '/icon dark.png' : '/icon white.png';
  }

  const navItems = [
    { name: 'Home', href: '/welcome', icon: Home, type: 'link' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, type: 'link' },
    { name: 'Públicos', href: '/audiences', icon: Users, type: 'link' },
    { name: 'Logs', href: '/logs', icon: HardDrive, type: 'link' },
    {
      name: 'Disparo',
      icon: Send,
      type: 'accordion',
      subItems: [
        { name: 'Disparo Pontual', href: '/disparo', icon: MessageSquare },
        { name: 'Agendar Campanha', href: '/agendar-campanha', icon: CalendarDays },
      ],
    },
    { name: 'Copy Agent', href: '/copy-agent', icon: Bot, type: 'link' },
    {
      name: 'Configurações',
      icon: Settings,
      type: 'accordion',
      subItems: [
        { name: 'Instâncias', href: '/instancias', icon: Server },
      ],
    },
  ];

  const isImpersonating = impersonatedTenantId && adminTenantId && impersonatedTenantId !== adminTenantId;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-[72px]",
        "bg-sidebar dark:bg-gray-900 dark:border-r dark:border-gray-800",
        isImpersonating ? "top-[52px]" : "top-0" // Adjust top position if banner is visible
      )}
    >
      <div className="flex flex-col h-full">
        {/* Seção do Logo */}
        <div className={cn("p-4 border-b border-border flex items-center", isSidebarOpen ? "justify-center h-28" : "justify-center h-16")}>
          <Link to="/dashboard" className="flex items-center justify-center">
            <img
              src={logoSrc}
              alt="DisparaLead Logo"
              className={cn("w-auto transition-all duration-300", isSidebarOpen ? "h-24" : "h-10")}
            />
          </Link>
        </div>

        {/* Tenant Switcher for Super Admin */}
        {isSuperAdmin && isSidebarOpen && (
          <div className="p-4 border-b border-border">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Navegar como:
            </div>
            <Select
              value={impersonatedTenantId || 'all'}
              onValueChange={handleTenantChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">{adminTenant ? adminTenant.name : 'Minha Conta'}</span>
                </SelectItem>
                {tenants.filter(t => t.id !== adminTenant?.id).map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isSuperAdmin && !isSidebarOpen && (
          <div className="p-4 border-b border-border flex justify-center">
            <Building className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Links de Navegação */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            // ... (rest of the component remains same)
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
                          "group [&[data-state=open]>svg]:rotate-0"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
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
                        <span className="sr-only">{item.name}</span>
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

        {/* Alternador de Tema */}
        <div className={cn("p-4 border-t border-border flex items-center", isSidebarOpen ? "justify-between" : "justify-center")}>
          {isSidebarOpen && <span className="text-sm text-sidebar-foreground">Modo Escuro</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isSidebarOpen && "w-full"
            )}
          >
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="sr-only">Alternar tema</span>
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