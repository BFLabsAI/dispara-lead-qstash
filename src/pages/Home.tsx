"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

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

      {/* 3 & 4. Seção combinada de Aviso e Primeiros Passos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Coluna da Esquerda: Aviso Importante */}
        <div className="animate-scale-in">
          <Card className="border-amber-500/50 bg-amber-500/10 h-full">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <CardTitle className="text-amber-700 dark:text-amber-400 text-2xl">
                AVISO IMPORTANTE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                NUNCA faça disparos em massa do seu número principal!
              </p>
              <p className="mt-2 text-amber-600/90 dark:text-amber-500/90">
                Utilizar seu número pessoal ou principal para envios em massa
                resultará em banimento pelo WhatsApp. É obrigatório o uso de
                números de telefone dedicados exclusivamente para esta finalidade.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da Direita: Primeiros Passos */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Primeiros Passos</h2>
          <div className="space-y-6">
            <StepCard
              icon={CheckCircle}
              title="Conecte suas Instâncias"
              description="Antes de tudo, vá para a seção de Instâncias e conecte os números que serão usados nos envios."
            />
            <StepCard
              icon={ShieldCheck}
              title="Use Números Dedicados"
              description="Proteja sua conta principal. Utilize apenas números comprados especificamente para as campanhas."
            />
            <StepCard
              icon={Clock}
              title="Configure Intervalos"
              description="Defina um tempo de espera seguro entre as mensagens para simular o comportamento humano e evitar bloqueios."
            />
          </div>
        </div>
      </section>

      {/* 5. Seção "Boas Práticas" */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Boas Práticas</h2>
          <p className="text-muted-foreground">
            Dicas para maximizar sua entrega e evitar problemas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {practiceItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg bg-card p-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-card-foreground">{item}</span>
            </div>
          ))}
        </div>
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
const StepCard = ({ icon: Icon, title, description }: any) => (
  <Card className="glass-card">
    <CardContent className="p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="mt-4 text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default Home;