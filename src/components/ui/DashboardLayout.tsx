"use client";

import React, { useState, useEffect } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  QrCode,
  Send,
  Moon,
  Sun,
  Bell,
  User,
  ChevronDown,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const DashboardLayout = () => {
  const [isDark, setIsDark] = useState(true); // Default to dark for premium look
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(() => {
    if (location.pathname === "/") return "Dashboard";
    if (location.pathname === "/instancias") return "Instâncias";
    if (location.pathname === "/disparo") return "Novo Disparo";
    return "Dashboard";
  });

  useEffect(() => {
    if (location.pathname === "/") setSelected("Dashboard");
    else if (location.pathname === "/instancias") setSelected("Instâncias");
    else if (location.pathname === "/disparo") setSelected("Novo Disparo");
  }, [location.pathname]);

  const menuItems = [
    { Icon: BarChart3, title: "Dashboard", path: "/", notifs: 0 },
    { Icon: QrCode, title: "Instâncias", path: "/instancias", notifs: 0 },
    { Icon: Send, title: "Novo Disparo", path: "/disparo", notifs: 0 },
  ];

  const handleNavigate = (path: string, title: string) => {
    navigate(path);
    setSelected(title);
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-700 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 flex flex-1">
        <Sidebar 
          open={open} 
          setOpen={setOpen} 
          selected={selected} 
          onNavigate={handleNavigate}
          menuItems={menuItems}
        />
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Premium Header */}
          <header className="glass-card py-6 px-6 text-left animate-slide-in-up z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  {selected === "Dashboard" ? "Dashboard" : selected === "Instâncias" ? "Gerenciamento de Instâncias" : "Novo Disparo"}
                </h1>
                <p className="text-gray-400 mt-1">
                  {selected === "Dashboard" ? "Bem-vindo ao seu dashboard premium" : selected === "Instâncias" ? "Gerencie suas instâncias do WhatsApp com excelência" : "Configure envios em massa com precisão"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="relative glass-card p-3 rounded-xl">
                  <Bell className="h-5 w-5" />
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 text-xs">3</Badge>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDark(!isDark)}
                  className="glass-card h-10 w-10 p-0 rounded-xl"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" className="glass-card h-10 w-10 p-0 rounded-xl">
                  <User className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>
          
          {/* Content */}
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ open, setOpen, selected, onNavigate, menuItems }) => {
  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out z-10 glass-card ${
        open ? 'w-64' : 'w-16'
      } p-2 shadow-sm`}
    >
      <TitleSection open={open} />

      <div className="space-y-1 mb-8">
        {menuItems.map((item) => (
          <Option
            key={item.title}
            Icon={item.Icon}
            title={item.title}
            selected={selected}
            onClick={() => onNavigate(item.path, item.title)}
            open={open}
            notifs={item.notifs}
          />
        ))}
      </div>

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

const Option = ({ Icon, title, selected, onClick, open, notifs }: { 
  Icon: React.ComponentType<any>; 
  title: string; 
  selected: string; 
  onClick: () => void;
  open: boolean; 
  notifs?: number; 
}) => {
  const isSelected = selected === title;
  
  return (
    <button
      onClick={onClick}
      className={`relative flex h-11 w-full items-center rounded-xl transition-all duration-200 w-full glass-card card-premium ${
        isSelected 
          ? "bg-green-500/20 border-green-500 text-green-300 shadow-sm border-l-2" 
          : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className={`h-4 w-4 ${isSelected ? 'text-green-400' : 'text-gray-400'}`} />
      </div>
      
      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ml-3 ${
            open ? 'opacity-100' : 'opacity-0'
          } ${isSelected ? 'text-green-300' : 'text-gray-400'}`}
        >
          {title}
        </span>
      )}

      {notifs && open && (
        <Badge variant="destructive" className="absolute right-3 flex h-5 w-5 items-center justify-center text-xs font-medium bg-red-500">
          {notifs}
        </Badge>
      )}
    </button>
  );
};

const TitleSection = ({ open }) => {
  return (
    <div className="mb-6 border-b border-gray-700 pb-4 glass-card rounded-xl p-3">
      <div className="flex cursor-pointer items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div className="transition-opacity duration-200">
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold gradient-text">
                    DisparaLead
                  </span>
                  <span className="block text-xs text-gray-400">
                    Premium
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
      <img src="https://i.ibb.co/8WjsnNk/dispara-lead.png" alt="DisparaLead" className="h-6 w-6" />
    </div>
  );
};

const ToggleClose = ({ open, setOpen }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-gray-700 transition-colors hover:bg-gray-800/50 glass-card"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span className="text-sm font-medium text-gray-400 transition-opacity duration-200 ml-3">
            Esconder
          </span>
        )}
      </div>
    </button>
  );
};