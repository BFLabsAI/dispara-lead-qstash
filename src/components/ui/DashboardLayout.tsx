"use client";

import React, { useState, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import {
  Home,
  Send,
  Settings,
  BarChart3,
  Users,
  ChevronDown,
  ChevronsRight,
  Moon,
  Sun,
  Bell,
  User,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {}

export const DashboardLayout = () => {
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();

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

  const menuItems = [
    { Icon: BarChart3, title: "Dashboard", path: "/", notifs: 0 },
    { Icon: QrCode, title: "Instâncias", path: "/instancias", notifs: 0 },
    { Icon: Send, title: "Novo Disparo", path: "/disparo", notifs: 0 },
  ];

  const updateSelected = (title: string) => {
    setSelected(title);
  };

  return (
    <div className={`flex min-h-screen w-full ${isDark ? 'dark' : ''}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar 
          open={open} 
          setOpen={setOpen} 
          selected={selected} 
          setSelected={updateSelected}
          menuItems={menuItems}
        />
        <div className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {selected === "Dashboard" ? "Dashboard" : selected === "Instâncias" ? "Gerenciamento de Instâncias" : "Novo Disparo"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {selected === "Dashboard" ? "Bem-vindo ao seu dashboard" : selected === "Instâncias" ? "Gerencie suas instâncias do WhatsApp" : "Configure e envie mensagens em massa"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 text-xs">3</Badge>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDark(!isDark)}
                className="h-10 w-10 p-0"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {/* Content */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ open, setOpen, selected, setSelected, menuItems }) => {
  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? 'w-64' : 'w-16'
      } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm`}
    >
      <TitleSection open={open} />

      <div className="space-y-1 mb-8">
        {menuItems.map((item) => (
          <Option
            key={item.title}
            Icon={item.Icon}
            title={item.title}
            selected={selected}
            setSelected={setSelected}
            open={open}
            notifs={item.notifs}
          />
        ))}
      </div>

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

const Option = ({ Icon, title, selected, setSelected, open, notifs }: { 
  Icon: React.ComponentType<any>; 
  title: string; 
  selected: string; 
  setSelected: React.Dispatch<React.SetStateAction<string>>; 
  open: boolean; 
  notifs?: number; 
}) => {
  const isSelected = selected === title;
  
  return (
    <button
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected 
          ? "bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 shadow-sm border-l-2 border-green-500" 
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className={`h-4 w-4 ${isSelected ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`} />
      </div>
      
      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          } ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}
        >
          {title}
        </span>
      )}

      {notifs && open && (
        <Badge variant="destructive" className="absolute right-3 flex h-5 w-5 items-center justify-center text-xs font-medium">
          {notifs}
        </Badge>
      )}
    </button>
  );
};

const TitleSection = ({ open }) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    DisparaLead
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Pro Plan
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
      <img src="https://i.ibb.co/8WjsnNk/dispara-lead.png" alt="DisparaLead" className="h-6 w-6" />
    </div>
  );
};

const ToggleClose = ({ open, setOpen }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Esconder
          </span>
        )}
      </div>
    </button>
  );
};