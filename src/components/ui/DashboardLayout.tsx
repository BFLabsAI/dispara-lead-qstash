"use client";

import * as React from "react";
import { Outlet, useLocation, Link } from "react-router-dom"; // Adicionado Link para navegação no sidebar
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarInset, 
  SidebarTrigger 
} from "@/components/ui/sidebar"; // Import completo do sidebar shadcn
import { Bell, Sun, User, Home, Settings, MessageCircle } from "lucide-react"; // Ícones para sidebar
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes"; // Hook para toggle de tema
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const location = useLocation();
  const [notifications] = React.useState(3); // Exemplo estático; substitua por estado real se precisar
  const { theme, setTheme } = useTheme(); // Hook do next-themes para alternar light/dark

  // Função para alternar tema (conecta o botão do sol)
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Títulos dinâmicos baseados na rota
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") {
      return { title: "Dashboard", subtitle: "Analytics e insights em tempo real" };
    } else if (path === "/instancias") {
      return { title: "Instâncias", subtitle: "Gerencie suas conexões WhatsApp" };
    } else if (path === "/disparo") {
      return { title: "Disparo", subtitle: "Configure envios de mensagens" };
    }
    return { title: "Painel", subtitle: "Bem-vindo ao DisparaLead" };
  };

  const { title, subtitle } = getPageTitle();

  return (
    <SidebarProvider> {/* Provider envolve tudo para sidebar e trigger funcionarem */}
      <div className="flex min-h-screen w-full flex-col bg-background">
        {/* Header fixo no topo - SÓ AQUI ficam os ícones (sem duplicatas) */}
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" /> {/* Trigger do sidebar - agora funciona */}
          </div>
          <div className="flex flex-1 items-center justify-between gap-2">
            {/* Espaço para logo ou busca, se quiser */}
          </div>
          <div className="flex items-center gap-2">
            {/* Botão de notificação - mantido aqui */}
            <Button variant="ghost" size="sm" className="glass-card text-muted-foreground hover:text-foreground relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 w-5 rounded-full p-0 text-xs absolute -top-1 -right-1"
                >
                  {notifications}
                </Badge>
              )}
            </Button>
            {/* Botão de tema (sol) - agora conectado ao toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="glass-card text-muted-foreground hover:text-foreground">
              <Sun className="h-4 w-4" />
            </Button>
            {/* Botão de usuário - mantido aqui */}
            <Button variant="ghost" size="sm" className="glass-card text-muted-foreground hover:text-foreground">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Conteúdo principal com sidebar */}
        <div className="flex flex-1">
          {/* Sidebar real - adicionado para abrir o menu com links de navegação */}
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/" className={cn("justify-start", location.pathname === "/" && "bg-accent")}>
                          <Home className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/instancias" className={cn("justify-start", location.pathname === "/instancias" && "bg-accent")}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Instâncias</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/disparo" className={cn("justify-start", location.pathname === "/disparo" && "bg-accent")}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          <span>Disparo</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* Área principal de conteúdo */}
          <SidebarInset>
            <div className="mx-auto w-full max-w-screen-2xl flex-1 overflow-auto p-4 md:p-6 lg:p-8">
              {/* Seção verde do header - AGORA SEM BOTÕES (só título e subtítulo, como pedido) */}
              <div className="mb-8 p-6 rounded-2xl shadow-xl gradient-primary text-white">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1"> {/* Só título e subtítulo aqui */}
                    <h1 className="text-4xl font-bold text-white">{title}</h1>
                    <p className="text-lg text-white/90">{subtitle}</p>
                  </div>
                  {/* SEM BOTÕES AQUI - removidos para evitar duplicata */}
                </div>
              </div>

              {/* Outlet para conteúdo das páginas - agora navegação funciona */}
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}