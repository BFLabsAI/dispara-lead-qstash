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
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
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
    { Icon: BarChart3, title: "Dashboard", path: "/", notifs: 3 },
    { Icon: QrCode, title: "Instâncias", path: "/instancias", notifs: 0 },
    { Icon: Send, title: "Novo Disparo", path: "/disparo", notifs: 0 },
  ];

  const handleNavigate = (path: string, title: string) => {
    navigate(path);
    setSelected(title);
  };

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Vibrant Background - Dark only, more subtle */}
      {!isDark ? null : (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-600/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-700/5 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
      )}

      <div className="relative z-10 flex flex-1">
        <Sidebar open={open} setOpen={setOpen} selected={selected} onNavigate={handleNavigate} menuItems={menuItems} isDark={isDark} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Premium Header - Spacious, elegant */}
          <header className="glass-card p-6 section-p text-left animate-slide-in-up z-10 border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className={`text-4xl font-bold ${isDark ? 'gradient-text' : 'text-gray-900'}`}>
                  {selected}
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {selected === "Dashboard" ? "Analytics e insights em tempo real" : selected === "Instâncias" ? "Gerencie conexões WhatsApp premium" : "Crie disparos massivos inteligentes"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" className={`relative glass-card p-3 rounded-xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <Bell className="h-5 w-5" />
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500">3</Badge>
                </Button>
                <Button onClick={toggleTheme} variant="ghost" className={`glass-card h-10 w-10 p-0 rounded-xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" className={`glass-card h-10 w-10 p-0 rounded-xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <User className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>
          
          {/* Content - Full height, scrollable */}
          <main className="flex-1 overflow-y-auto p-6 section-p">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

// Sidebar - Premium gradient bg, white icons
const Sidebar = ({ open, setOpen, selected, onNavigate, menuItems, isDark }) => (
  <nav className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out z-10 ${isDark ? 'gradient-primary/10 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md'} ${open ? 'w-64' : 'w-16'} p-4 shadow-lg border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
    <TitleSection open={open} />
    <div className="space-y-2 mt-8 mb-auto">
      {menuItems.map((item) => (
        <Option key={item.title} Icon={item.Icon} title={item.title} selected={selected} onClick={() => onNavigate(item.path, item.title)} open={open} notifs={item.notifs} isDark={isDark} />
      ))}
    </div>
    <ToggleClose open={open} setOpen={setOpen} isDark={isDark} />
  </nav>
);

const Option = ({ Icon, title, selected, onClick, open, notifs, isDark }) => {
  const isSelected = selected === title;
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={`relative flex h-12 w-full items-center justify-start rounded-xl transition-all duration-200 glass-card card-premium ${isSelected ? 'gradient-primary text-white shadow-lg' : isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <Icon className={`h-5 w-5 mr-3 ${isSelected ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'}`} />
      {open && <span className={`font-semibold ${isSelected ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>{title}</span>}
      {notifs && open && <Badge className={`absolute right-3 ${isDark ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}>{notifs}</Badge>}
    </Button>
  );
};

const TitleSection = ({ open }) => (
  <div className="mb-8 border-b border-white/10 pb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="gradient-primary p-3 rounded-xl">
          <i className="fas fa-rocket text-white text-xl"></i>
        </div>
        {open && (
          <div>
            <h2 className="text-xl font-bold gradient-text">DisparaLead</h2>
            <p className="text-xs text-gray-400">Premium Automation</p>
          </div>
        )}
      </div>
      {open && <ChevronDown className="h-4 w-4 text-gray-400" />}
    </div>
  </div>
);

const ToggleClose = ({ open, setOpen, isDark }) => (
  <Button
    onClick={() => setOpen(!open)}
    variant="ghost"
    className={`w-full rounded-xl glass-card ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
  >
    <ChevronsRight className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''} ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
    {open && <span className={`ml-3 font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Esconder</span>}
  </Button>
);