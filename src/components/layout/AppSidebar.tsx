"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, LayoutDashboard, Server, Send, Settings, CalendarDays,
  MessageSquare, HardDrive, Link as LinkIcon, Bot,
  ChevronLeft, ChevronRight, Sun, Moon, Building, Users, LogOut, List
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
import {
  getTenantAccessSummary,
  setActiveTenantId,
  supabase,
  type TenantAccessSummary,
} from "@/services/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useIsMobile } from "@/hooks/use-mobile";

export const AppSidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();
  const impersonatedTenantId = useAdminStore((state) => state.impersonatedTenantId);
  const setAdminTenantId = useAdminStore((state) => state.setAdminTenantId);
  const resetAdminContext = useAdminStore((state) => state.resetAdminContext);
  const adminTenantId = useAdminStore((state) => state.adminTenantId);
  const [tenantAccess, setTenantAccess] = useState<TenantAccessSummary | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadTenantAccess = async () => {
      setAccessLoading(true);

      try {
        const summary = await getTenantAccessSummary();
        if (cancelled) return;

        setTenantAccess(summary);

        if (summary.isSuperAdmin) {
          setAdminTenantId(summary.homeTenantId);
          if (!impersonatedTenantId && summary.homeTenantId) {
            await setActiveTenantId(summary.homeTenantId);
          }
        } else {
          setAdminTenantId(null);
          if (!impersonatedTenantId && summary.activeTenantId) {
            await setActiveTenantId(summary.activeTenantId);
          }
        }
      } catch {
        if (!cancelled) {
          resetAdminContext();
          setTenantAccess(null);
        }
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    };

    loadTenantAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleTenantChange = async (value: string) => {
    const nextTenantId = value === '__home__' ? tenantAccess?.homeTenantId : value;
    await setActiveTenantId(nextTenantId || null);
    setTimeout(() => window.location.reload(), 100);
  };

  // ... (logo logic)
  let logoSrc: string;
  if (isSidebarOpen) {
    logoSrc = theme === 'dark' ? '/3.png' : '/2.png';
  } else {
    logoSrc = theme === 'dark' ? '/icon dark.png' : '/icon white.png';
  }

  const userRole = tenantAccess?.activeRole ?? null;
  const isSuperAdmin = tenantAccess?.isSuperAdmin ?? false;
  const accessibleTenants = tenantAccess?.accessibleTenants ?? [];
  const activeTenantId = impersonatedTenantId || tenantAccess?.activeTenantId || null;
  const showTenantSwitcher = isSuperAdmin || accessibleTenants.length > 1;
  const homeTenant = tenantAccess?.homeTenantId
    ? accessibleTenants.find((tenant) => tenant.id === tenantAccess.homeTenantId) || null
    : null;
  const selectedTenant = activeTenantId
    ? accessibleTenants.find((tenant) => tenant.id === activeTenantId) || null
    : null;
  const selectedTenantValue = isSuperAdmin
    ? (activeTenantId && activeTenantId !== tenantAccess?.homeTenantId ? activeTenantId : '__home__')
    : (activeTenantId || selectedTenant?.id || '');

  const navItems = [
    { name: 'Home', href: '/welcome', icon: Home, type: 'link' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, type: 'link' },
    { name: 'Atendimento', href: '/chats', icon: MessageSquare, type: 'link' },
    ...(isSuperAdmin ? [{ name: 'Manager Portal', href: '/admin', icon: Server, type: 'link' }] : []),
    { name: 'Contatos', href: '/contatos', icon: LinkIcon, type: 'link' },
    { name: 'Públicos', href: '/audiences', icon: Users, type: 'link' },
    { name: 'Logs', href: '/logs', icon: HardDrive, type: 'link' },
    {
      name: 'Disparo',
      icon: Send,
      type: 'accordion',
      subItems: [
        { name: 'Disparo Pontual', href: '/disparo', icon: MessageSquare },
        { name: 'Agendar Campanha', href: '/agendar-campanha', icon: CalendarDays },
        { name: 'Gerenciar Campanhas', href: '/campaigns', icon: List },
      ],
    },
    { name: 'Copy Agent', href: '/copy-agent', icon: Bot, type: 'link' },
    {
      name: 'Configurações',
      icon: Settings,
      type: 'accordion',
      subItems: [
        { name: 'Instâncias', href: '/instancias', icon: Server },
        { name: 'Notificações', href: '/settings', icon: Settings },
        ...((userRole === 'admin' || userRole === 'owner') ? [{ name: 'Equipe', href: '/settings/users', icon: Users }] : []),
      ],
    },
  ];

  const isImpersonating = Boolean(isSuperAdmin && impersonatedTenantId && adminTenantId && impersonatedTenantId !== adminTenantId);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
        isMobile
          ? (isSidebarOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full w-64")
          : (isSidebarOpen ? "w-64" : "w-[72px]"),
        "bg-white dark:bg-gray-900 border-r border-border dark:border-gray-800",
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

        {/* Tenant Switcher */}
        {showTenantSwitcher && isSidebarOpen && !accessLoading && (
          <div className="p-4 border-b border-border">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isSuperAdmin ? 'Navegar como:' : 'Empresa ativa:'}
            </div>
            <Select
              value={selectedTenantValue}
              onValueChange={handleTenantChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && (
                  <SelectItem value="__home__">
                    <span className="font-medium">{homeTenant?.name || 'Minha conta'}</span>
                  </SelectItem>
                )}
                {accessibleTenants
                  .filter((tenant) => !isSuperAdmin || tenant.id !== tenantAccess?.homeTenantId)
                  .map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showTenantSwitcher && !isSidebarOpen && !accessLoading && (
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

        <div className="border-t border-border p-4">
          {isSidebarOpen && (
            <div className="mb-2 text-center text-[10px] font-light tracking-widest text-muted-foreground/50">
              v3.0
            </div>
          )}

          <div
            className={cn(
              "flex items-center",
              isSidebarOpen ? "justify-between gap-2.5" : "flex-col justify-center gap-2"
            )}
          >
            {isSidebarOpen ? (
              <>
                <div className="flex items-center gap-1.5 rounded-2xl border border-red-200/80 bg-[linear-gradient(135deg,rgba(254,242,242,0.98),rgba(254,226,226,0.9))] px-2 py-1.5 shadow-sm dark:border-red-950/80 dark:bg-[linear-gradient(135deg,rgba(69,10,10,0.72),rgba(127,29,29,0.42))]">
                  <span className="px-1 text-sm font-medium text-red-700 dark:text-red-100">Sair</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      useAdminStore.getState().setImpersonatedTenantId(null);
                      useAdminStore.getState().setAdminTenantId(null);

                      await supabase.auth.signOut();
                      window.location.href = '/login';
                    }}
                    className="h-8 w-8 rounded-xl bg-red-500 text-white shadow-sm transition-all hover:bg-red-600 hover:text-white dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Sair</span>
                  </Button>
                </div>

                <div className="h-5 w-px shrink-0 bg-border/70" />

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="group flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(240,253,244,0.98),rgba(220,252,231,0.92))] px-2.5 py-1.5 text-sidebar-foreground shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/80 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.6),rgba(2,44,34,0.54))] dark:hover:border-emerald-800 dark:hover:bg-emerald-900/60"
                >
                  <span className="px-1 text-sm font-medium">
                    {theme === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition-transform group-hover:scale-[1.03] dark:bg-emerald-500 dark:text-emerald-950">
                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </span>
                  <span className="sr-only">Alternar tema</span>
                </button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    useAdminStore.getState().setImpersonatedTenantId(null);
                    useAdminStore.getState().setAdminTenantId(null);

                    await supabase.auth.signOut();
                    window.location.href = '/login';
                  }}
                  className="h-10 w-10 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Sair</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-10 w-10 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span className="sr-only">Alternar tema</span>
                </Button>
              </>
            )}
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
              <ChevronRight className="h-5 w-5" />
            )}
            {isSidebarOpen && <span>{isSidebarOpen ? 'Encolher Menu' : 'Expandir Menu'}</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};
