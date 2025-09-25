"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  Send,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Clock,
  ArrowRight,
  ListChecks,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

const practiceItems = [
  "Segmente sua base por perfil",
  "Personalize mensagens com variáveis",
  "Teste em grupos pequenos primeiro",
  "Respeite intervalos de 2-5 segundos",
  "Monitore métricas de entrega",
  "Cuidado com horários comerciais",
  "Tenha números de backup",
  "Faça aquecimento dos números novos",
];

const Home = () => {
  return (
    <div className="space-y-12">
      {/* 1. Seção Hero/Boas-vindas */}
      <section className="text-center animate-slide-in-up">
        <h1 className="text-5xl font-bold tracking-tight gradient-text">
          Bem-vindo ao DisparaLead
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          O que deseja fazer agora?
        </p>
      </section>

      {/* 2. Cards de Navegação Principal */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NavigationCard
          to="/dashboard"
          icon={LayoutDashboard}
          title="Dashboard"
          description="Analytics e insights em tempo real"
        />
        <NavigationCard
          to="/instancias"
          icon={Server}
          title="Instâncias WhatsApp"
          description="Gerencie suas conexões e monitore status"
        />
        <NavigationCard
          to="/disparo"
          icon={Send}
          title="Campanhas"
          description="Configure cadências e execute disparos"
        />
      </section>

      {/* 3 & 4. Seção combinada de Primeiros Passos e Boas Práticas */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Coluna da Esquerda: Primeiros Passos */}
        <div>
          <div className="flex items-center mb-6">
            <ListChecks className="h-8 w-8 mr-3 text-primary" />
            <h2 className="text-3xl font-bold">Primeiros Passos</h2>
          </div>
          <div className="space-y-6">
            <StepCard
              icon={CheckCircle}
              title="Conecte suas Instâncias"
              description="O passo inicial é acessar a seção 'Instâncias' no menu. Lá, você poderá conectar todos os números de WhatsApp que pretende usar. Siga as instruções para escanear o QR Code e deixar suas contas prontas para os envios."
            />
            <StepCard
              icon={ShieldCheck}
              title="Use Números Dedicados"
              description="Para garantir a segurança da sua conta principal, é crucial usar números de telefone comprados exclusivamente para as campanhas. Evite usar seu número pessoal ou o principal da sua empresa, pois isso pode levar a bloqueios."
            />
            <StepCard
              icon={Clock}
              title="Configure Intervalos"
              description="Para evitar ser identificado como spam, configure um intervalo de tempo realista entre cada mensagem. Recomendamos de 2 a 5 segundos para simular um comportamento humano e aumentar a taxa de entrega das suas campanhas."
            />
          </div>
        </div>

        {/* Coluna da Direita: Boas Práticas */}
        <div>
          <div className="flex items-center mb-6">
            <ThumbsUp className="h-8 w-8 mr-3 text-primary" />
            <h2 className="text-3xl font-bold">Boas Práticas</h2>
          </div>
          <div className="space-y-4">
            {practiceItems.map((item, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg bg-card p-4 h-full">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-card-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Bloco de Alerta Crítico no Final */}
      <section className="animate-scale-in">
        <Card className="border-primary/50 bg-primary/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-primary flex-shrink-0" />
                <h3 className="text-xl font-bold text-primary">
                  AVISO IMPORTANTE
                </h3>
              </div>
              <p className="text-primary/90 sm:border-l sm:pl-6 sm:border-primary/30 flex-1">
                <span className="font-semibold">NUNCA faça disparos em massa do seu número principal!</span> Utilizar seu número pessoal para envios em massa resultará em banimento. Use sempre números dedicados para esta finalidade.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

// Componente para os cards de navegação
const NavigationCard = ({ to, icon: Icon, title, description }: any) => (
  <Link to={to} className="group block">
    <Card className="glass-card h-full transform transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl">
      <CardContent className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <div className="mt-6 flex items-center justify-center text-sm font-semibold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Acessar <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  </Link>
);

// Componente para os cards de primeiros passos
const StepCard = ({ icon: Icon, title, description, className }: { icon: React.ElementType, title: string, description: string, className?: string }) => (
  <Card className={cn("glass-card", className)}>
    <CardContent className="p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
      </div>
      <p className="mt-4 text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default Home;