import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    TrendingUp,
    DollarSign,
    BarChart3,
    Zap,
    Users,
    Lock,
    CheckCircle2,
    ArrowRight,
    MessageSquare,
    Target,
    Bot,
    Sparkles,
    Menu,
    X,
    RefreshCw,
    PenTool,
    Lightbulb,
    LineChart,
    PieChart,
    Layers,
    Globe,
    Fingerprint,
    Activity,
    LayoutDashboard,
    Search,
    MousePointer2,
    ChevronRight,
    Settings,
    UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/context/ThemeContext';
import { DiagnosticPopup } from '@/components/DiagnosticPopup';

const LandingPage = () => {
    const [messageVolume, setMessageVolume] = useState<number>(10000);
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const { theme } = useTheme();

    const apiCostPerMessage = 0.33;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const calculateApiCost = (volume: number) => {
        return (volume * apiCostPerMessage).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-900">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        :root {
          --font-sans: 'Plus Jakarta Sans', sans-serif;
        }
        
        body {
          font-family: var(--font-sans);
        }

        /* Smooth Scroll & Animations */
        html { scroll-behavior: smooth; }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float-slow 8s ease-in-out infinite;
        }

        /* 3D Perspective */
        .perspective-container {
          perspective: 2000px;
        }
        .rotate-3d {
          transform: rotateX(20deg) rotateY(-10deg) rotateZ(5deg) scale(0.9);
          transition: transform 0.5s ease-out;
        }
        .rotate-3d:hover {
          transform: rotateX(10deg) rotateY(-5deg) rotateZ(2deg) scale(0.95);
        }
        
        /* Disable 3D on mobile */
        @media (max-width: 768px) {
           .perspective-container { perspective: none; }
           .rotate-3d { transform: none !important; }
           .rotate-3d:hover { transform: none !important; }
        }

        /* Glassmorphism */
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        .glass-nav {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        /* Magnifying Glass Effect */
        .magnify-glass {
           background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
           backdrop-filter: blur(8px);
           box-shadow: 
              inset 0 0 20px rgba(255,255,255,0.8),
              inset 0 0 5px rgba(255,255,255,1),
              0 20px 40px rgba(0,0,0,0.15);
           border: 1px solid rgba(255,255,255,0.9);
        }
        
        .magnified-content {
           transform: scale(1.3);
           transform-origin: center;
        }

        /* Noise Texture */
        .noise-bg {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
        }
        
        .tech-pattern {
           background-image: 
             linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
             linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
           background-size: 40px 40px;
        }
      `}</style>

            {/* Sticky Header */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'glass-nav py-4 shadow-sm' : 'bg-transparent py-6'
                    }`}
            >
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 p-1.5 rounded-lg">
                            <img
                                src="/icon white.png"
                                alt="DisparaLead Logo"
                                className="h-6 w-auto brightness-0 invert"
                                onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">DisparaLead</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <nav className="flex gap-8">
                            {['Funcionalidades', 'Agentes IA', 'Economia'].map((item) => (
                                <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors">
                                    {item}
                                </a>
                            ))}
                        </nav>
                        <div className="flex items-center gap-4 ml-4">
                            <Link to="/login">
                                <Button className="font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all px-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                                    Login
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="md:hidden">
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-900">
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </header>

            {/* 1. Hero Section - Asymmetrical & 3D */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
                <div className="absolute inset-0 noise-bg opacity-30 pointer-events-none"></div>

                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">

                        {/* Left: Content */}
                        <div className="lg:w-1/2 text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in-up">
                                <Sparkles className="w-3 h-3" />
                                Nova Era do Marketing
                            </div>

                            <h1 className="text-5xl lg:text-8xl font-bold tracking-tighter mb-8 leading-[0.95] text-slate-900 animate-fade-in-up delay-100">
                                Escala com <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Inteligência.</span>
                            </h1>

                            <p className="text-lg lg:text-xl text-slate-500 max-w-lg mb-10 leading-relaxed animate-fade-in-up delay-200">
                                A única plataforma com <strong>Tracking Real</strong> e o mais avançado <strong>Sistema Anti-Bloqueio</strong>. Pare de pagar R$ 0,33 por mensagem na API oficial.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-300">
                                <Button size="lg" onClick={() => setIsPopupOpen(true)} className="h-14 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 font-bold text-lg shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all w-full sm:w-auto">
                                    Começar Agora
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <div className="flex items-center justify-center sm:justify-start gap-4 px-6 text-sm font-medium text-slate-500">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                                        ))}
                                    </div>
                                    +150 Empresas
                                </div>
                            </div>
                        </div>

                        {/* Right: 3D Floating Dashboard */}
                        <div className="lg:w-1/2 w-full perspective-container animate-fade-in-up delay-300 mt-10 lg:mt-0">
                            <div className="relative rotate-3d w-full max-w-[800px] mx-auto">
                                {/* Floating Elements */}
                                <div className="hidden md:block absolute -right-10 top-20 z-20 bg-white p-4 rounded-2xl shadow-2xl animate-float border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-2 rounded-lg text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
                                        <div>
                                            <div className="text-xs text-slate-400 font-bold">Status</div>
                                            <div className="text-sm font-bold text-slate-900">Campanha Ativa</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Dashboard Mock (Detailed) */}
                                <div className="bg-[#022c22] rounded-2xl shadow-2xl border border-emerald-900/50 overflow-hidden ring-1 ring-white/10">
                                    {/* Browser Bar */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-[#0f172a] border-b border-white/5">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-slate-600" />
                                            <div className="w-3 h-3 rounded-full bg-slate-600" />
                                            <div className="w-3 h-3 rounded-full bg-slate-600" />
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="inline-block px-3 py-1 rounded-md bg-[#1e293b] text-[10px] text-slate-400 font-mono">
                                                dashboard.disparalead.com
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex h-[350px] md:h-[450px]">
                                        {/* Sidebar */}
                                        <div className="w-12 md:w-48 bg-[#0f172a] border-r border-white/5 p-2 md:p-3 flex flex-col gap-1">
                                            <div className="mb-6 px-2 flex items-center gap-2 text-white font-bold"><Zap className="w-5 h-5 text-emerald-500" /> <span className="hidden md:inline">Dispara</span></div>
                                            {['Dashboard', 'Disparo', 'Copy Agent', 'Configurações'].map((item, i) => (
                                                <div key={i} className={`p-2 rounded-lg text-xs font-medium flex items-center gap-2 ${i === 0 ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400'}`}>
                                                    <LayoutDashboard className="w-4 h-4" /> <span className="hidden md:inline">{item}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 bg-gradient-to-br from-[#022c22] to-[#064e3b] p-4 md:p-6 relative overflow-hidden">
                                            {/* Tech Grid Pattern */}
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                                <div className="col-span-2 bg-[#065f46] rounded-xl p-4 border border-emerald-500/20">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-white font-bold text-sm">Total de Envios</span>
                                                        <BarChart3 className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    <div className="text-2xl md:text-3xl font-bold text-white">5,808</div>
                                                    <div className="text-xs text-emerald-300 mt-1">+12% este mês</div>
                                                </div>
                                                <div className="bg-[#022c22] rounded-xl p-4 border border-emerald-900/50 flex flex-col items-center justify-center h-24 md:h-32">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 relative">
                                                        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">74%</div>
                                                    </div>
                                                    <div className="text-[10px] text-emerald-400 mt-2">Campanhas</div>
                                                </div>
                                                <div className="bg-[#022c22] rounded-xl p-4 border border-emerald-900/50 flex flex-col items-center justify-center h-24 md:h-32">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-emerald-500/20 border-r-emerald-500 relative">
                                                        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">82%</div>
                                                    </div>
                                                    <div className="text-[10px] text-emerald-400 mt-2">Criativos</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Bento Grid - Challenges (Improved Contrast & Real Text) */}
            <section className="py-20 md:py-32 bg-slate-100">
                <div className="container mx-auto px-6">
                    <div className="mb-12 md:mb-20 max-w-2xl">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">
                            Tecnologia para <br />
                            <span className="text-emerald-600">Gerar Lucro.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[300px]">
                        {/* Large Card */}
                        <div className="md:col-span-2 bg-gradient-to-br from-red-50 via-rose-25 to-white rounded-[2rem] p-8 md:p-10 shadow-xl shadow-rose-200/50 border-2 border-red-200 relative overflow-hidden group hover:shadow-2xl hover:border-red-300 transition-all duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-200 to-rose-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-40 group-hover:opacity-60 transition-opacity"></div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-white mb-6 shadow-lg">
                                        <BarChart3 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Desorganização Custa Caro</h3>
                                    <p className="text-lg text-slate-600 max-w-md">Sua base precisa de estratégia. Sem segmentação, você está queimando leads valiosos.</p>
                                </div>
                                <div className="flex gap-2 mt-8">
                                    <div className="h-2 w-24 bg-red-100 rounded-full overflow-hidden shadow-inner"><div className="h-full w-1/3 bg-gradient-to-r from-red-500 to-rose-500"></div></div>
                                    <div className="h-2 w-16 bg-slate-100 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Tall Card (Risco Zero - Green) */}
                        <div className="md:row-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] p-8 md:p-10 shadow-xl shadow-emerald-200/50 border-2 border-emerald-300 relative overflow-hidden group hover:shadow-2xl hover:border-emerald-400 transition-all duration-500">
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-emerald-200 to-transparent opacity-30"></div>
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Risco Zero</h3>
                                <p className="text-lg text-slate-600 mb-8">O sistema de proteção mais avançado do mercado.</p>

                                <div className="mt-auto space-y-4">
                                    {[
                                        { icon: ShieldCheck, text: 'Proteção de IP' },
                                        { icon: RefreshCw, text: 'Rotação de Proxy' },
                                        { icon: UserCheck, text: 'Simulação Humana' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-emerald-100 shadow-sm">
                                            <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-600">
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Medium Card */}
                        <div className="bg-gradient-to-br from-orange-50 via-amber-25 to-white rounded-[2rem] p-8 md:p-10 shadow-xl shadow-orange-200/50 border-2 border-orange-200 relative overflow-hidden group hover:shadow-2xl hover:border-orange-300 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-transparent opacity-20"></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white mb-6 shadow-lg">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Custo API</h3>
                                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">R$ 0,33</div>
                                <p className="text-sm text-slate-500">por mensagem na Meta</p>
                            </div>
                        </div>

                        {/* Medium Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 md:p-10 shadow-xl shadow-slate-900/20 border-2 border-slate-700 relative overflow-hidden group hover:shadow-2xl hover:border-slate-600 transition-all duration-500 text-white">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white mb-6 shadow-lg">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2">DisparaLead</h3>
                                <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">Fixo</div>
                                <p className="text-sm text-slate-400">Assinatura mensal</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. AI Agents Section (Restored) */}
            <section id="agentes-ia" className="py-20 md:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                            Inteligência Artificial que <br />
                            <span className="text-emerald-600">Cria por Você.</span>
                        </h2>
                        <p className="text-xl text-slate-500">
                            Nossos agentes não apenas enviam. Eles criam, adaptam e otimizam cada mensagem para máxima conversão.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Agent 1: Copy */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div className="relative bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl h-full">
                                <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 mb-8">
                                    <PenTool className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-4">Agente de Copy</h3>
                                <p className="text-lg text-slate-500 mb-8">
                                    Esqueça o bloqueio criativo. Nosso agente analisa seu nicho e cria scripts de alta conversão em segundos.
                                </p>

                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                                    <div className="flex gap-3 mb-4">
                                        <div className="w-8 h-8 min-w-[2rem] min-h-[2rem] flex-shrink-0 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
                                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-600 border border-slate-100">
                                            "Olá! Vi que você tem interesse em escalar suas vendas. Que tal automatizar esse processo?"
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">Persuasivo</div>
                                        <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">Curto</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Agent 2: Variation */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div className="relative bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl h-full">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-8">
                                    <RefreshCw className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-4">Agente de Variação</h3>
                                <p className="text-lg text-slate-500 mb-8">
                                    O segredo do Anti-Bloqueio. O agente reescreve suas mensagens automaticamente para que cada envio seja único.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm text-slate-600">Variação A: "Oi, tudo bem?"</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm text-slate-600">Variação B: "Olá, como vai?"</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm text-slate-600">Variação C: "E aí, tudo certo?"</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Analytics - Deep Green Void (Densified) */}
            <section className="py-20 md:py-32 bg-[#022c22] relative overflow-hidden tech-pattern">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#022c22]/90 pointer-events-none"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-10">
                        <div className="max-w-xl">
                            <h2 className="text-4xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                                Controle <br />
                                <span className="text-emerald-500">Total.</span>
                            </h2>
                            <p className="text-lg md:text-xl text-emerald-100/60">
                                Não é só enviar. É ter a inteligência dos dados na palma da sua mão.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-6 py-3 rounded-full border border-emerald-500/30 text-emerald-400 font-mono text-sm flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                API Status: Online
                            </div>
                        </div>
                    </div>

                    {/* Mission Control UI */}
                    <div className="w-full min-h-[800px] md:h-[600px] bg-[#064e3b]/30 backdrop-blur-md rounded-3xl border border-emerald-500/20 relative overflow-hidden grid grid-cols-1 gap-6 p-6 md:p-8 md:grid-cols-3">
                        {/* Data Lines Animation */}
                        <div className="absolute inset-0 pointer-events-none hidden md:block">
                            <div className="w-full h-[1px] bg-emerald-500/10 absolute top-1/2"></div>
                            <div className="h-full w-[1px] bg-emerald-500/10 absolute left-1/3"></div>
                            <div className="h-full w-[1px] bg-emerald-500/10 absolute right-1/3"></div>
                        </div>

                        {/* Widget 1: Conversion - Rich Metrics */}
                        <div className="col-span-1 md:col-span-1 bg-[#022c22] rounded-2xl border border-emerald-500/20 p-6 shadow-xl flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs text-emerald-400 mb-1 font-mono">CONVERSÃO</div>
                                    <div className="text-5xl md:text-6xl font-bold text-white mb-1">24.8%</div>
                                    <div className="text-xs text-emerald-100/50">vs 22.1% mês anterior</div>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +12.2%
                                </div>
                            </div>

                            {/* Mini Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <div className="text-[10px] text-emerald-100/50 mb-1">LEADS TOTAL</div>
                                    <div className="text-xl font-bold text-white">1,847</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <div className="text-[10px] text-emerald-100/50 mb-1">CONVERTIDOS</div>
                                    <div className="text-xl font-bold text-emerald-400">458</div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div>
                                <div className="text-[10px] text-emerald-100/50 mb-2 font-mono">ÚLTIMOS 10 DIAS</div>
                                <div className="h-16 flex items-end gap-1">
                                    {[40, 60, 45, 70, 50, 80, 65, 90, 75, 85].map((h, i) => (
                                        <div key={i} className="flex-1 min-w-[6px] bg-emerald-900/50 rounded-t-md relative group cursor-pointer">
                                            <div
                                                className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all duration-500 group-hover:from-emerald-400 group-hover:to-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                                style={{ height: `${h}%` }}
                                            ></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Stats */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-xs text-emerald-100/70">Meta: 25%</span>
                                </div>
                                <span className="text-xs text-emerald-400 font-bold">Faltam 0.2%</span>
                            </div>
                        </div>

                        {/* Widget 2: Active Campaigns */}
                        <div className="col-span-1 md:col-span-2 bg-[#022c22] rounded-2xl border border-emerald-500/20 p-6 shadow-xl min-h-[250px]">
                            <div className="flex justify-between items-center mb-6">
                                <div className="text-xs text-emerald-400 font-mono">CAMPANHAS ATIVAS</div>
                                <Settings className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { name: 'Black Friday - Lista VIP', status: 'Enviando', progress: 78 },
                                    { name: 'Recuperação de Carrinho', status: 'Agendado', progress: 0 },
                                    { name: 'Reativação Clientes 2023', status: 'Concluído', progress: 100 },
                                ].map((camp, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                                        <div className="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex-shrink-0 rounded-lg bg-emerald-900/50 flex items-center justify-center text-emerald-500 font-bold text-xs shadow-inner">{i + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-bold text-sm mb-1 truncate">{camp.name}</div>
                                            <div className="text-xs text-emerald-100/50">{camp.status}</div>
                                        </div>
                                        <div className="w-20 md:w-24 flex-shrink-0">
                                            <div className="h-1.5 w-full bg-emerald-900 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${camp.progress}%` }}></div>
                                            </div>
                                            <div className="text-[10px] text-emerald-400 font-bold mt-1 text-right">{camp.progress}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Widget 3: Entregabilidade */}
                        <div className="col-span-1 md:col-span-3 bg-[#022c22] rounded-2xl border border-emerald-500/20 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 min-h-[150px]">
                            <div className="w-full md:w-auto">
                                <div className="text-xs text-emerald-400 mb-2 font-mono">ENTREGABILIDADE</div>
                                <div className="text-4xl font-bold text-white">99.2%</div>
                            </div>
                            <div className="flex-1 w-full md:mx-10">
                                <div className="h-2 w-full bg-emerald-900 rounded-full overflow-hidden">
                                    <div className="h-full w-[99%] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
                                </div>
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold w-full md:w-auto text-center">
                                EXCELENTE
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. The Insight - MAGNIFYING GLASS VISUAL (Contrasted) */}
            <section className="py-20 md:py-40 bg-emerald-50 relative overflow-hidden">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-12 md:mb-24">
                        O Segredo do Lucro
                    </h2>

                    <div className="relative max-w-4xl mx-auto h-[300px] md:h-[400px] flex items-center justify-center">
                        {/* Background Text (Blurred/Small) */}
                        <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40 pointer-events-none">
                            {[...Array(16)].map((_, i) => (
                                <div key={i} className="text-[10px] md:text-xs text-emerald-900 font-mono">
                                    LEAD_COST: HIGH <br />
                                    CAC: R$ 50,00 <br />
                                    ROI: LOW
                                </div>
                            ))}
                        </div>

                        {/* The Magnifying Glass */}
                        <div className="relative w-64 h-64 md:w-80 md:h-80 z-10 group cursor-none">
                            {/* Handle */}
                            <div className="absolute -bottom-12 -right-12 md:-bottom-16 md:-right-16 w-32 md:w-40 h-10 md:h-12 bg-slate-900 rotate-45 rounded-full shadow-xl"></div>

                            {/* Glass Rim */}
                            <div className="absolute inset-0 rounded-full border-[12px] md:border-white border-emerald-300 bg-white/20 backdrop-blur-sm shadow-2xl"></div>

                            {/* The Lens (Magnified Content) */}
                            <div className="absolute inset-2 rounded-full overflow-hidden bg-white flex items-center justify-center magnify-glass">
                                <div className="text-center magnified-content">
                                    <div className="text-xs md:text-sm font-bold text-slate-400 mb-2 tracking-widest uppercase">Insight</div>
                                    <div className="text-4xl md:text-6xl font-bold text-emerald-600 mb-2">+700%</div>
                                    <div className="text-lg md:text-xl font-bold text-slate-900">ROI</div>
                                    <div className="mt-4 text-[10px] md:text-xs text-slate-500 max-w-[150px] mx-auto">
                                        Reativar leads é 7x mais barato que adquirir.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 md:mt-20">
                        <Button size="lg" onClick={() => setIsPopupOpen(true)} className="h-14 md:h-16 px-8 md:px-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg md:text-xl shadow-2xl shadow-emerald-600/30 hover:scale-105 transition-transform w-full md:w-auto">
                            Quero Esse Resultado
                        </Button>
                    </div>
                </div>
            </section>

            {/* 6. Calculadora de Economia (Restored) */}
            <section id="pricing" className="py-20 md:py-32 bg-[#022c22] text-white relative overflow-hidden tech-pattern">
                <div className="absolute inset-0 bg-gradient-to-t from-[#022c22] to-transparent pointer-events-none"></div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-16 shadow-2xl">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Chega de Pagar R$ 0,33 por Mensagem</h2>
                            <p className="text-emerald-100/80 text-lg md:text-xl">O DisparaLead oferece a escala que você precisa com o custo fixo previsível.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-lg font-medium opacity-90">Seu Volume de Mensagens Mensais</label>
                                    <Input
                                        type="number"
                                        value={messageVolume}
                                        onChange={(e) => setMessageVolume(Number(e.target.value))}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-4xl md:text-6xl h-20 md:h-24 font-bold text-center focus-visible:ring-white/30 rounded-2xl"
                                    />
                                    <input
                                        type="range"
                                        min="1000"
                                        max="100000"
                                        step="1000"
                                        value={messageVolume}
                                        onChange={(e) => setMessageVolume(Number(e.target.value))}
                                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-emerald-100/50">
                                        <span>1.000</span>
                                        <span>100.000</span>
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-lg opacity-75">Custo API Oficial (Meta)</span>
                                        <span className="text-2xl md:text-3xl font-bold text-red-300">{calculateApiCost(messageVolume)}</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-3">
                                        <div className="bg-red-400 h-3 rounded-full shadow-[0_0_10px_rgba(248,113,113,0.5)]" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white text-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl transform md:scale-110 relative">
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg">
                                    MELHOR ESCOLHA
                                </div>
                                <div className="text-center space-y-6">
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Seu Custo no DisparaLead</p>
                                    <div className="text-5xl md:text-6xl font-extrabold text-emerald-700 tracking-tight">
                                        Fixo
                                    </div>
                                    <p className="text-lg text-slate-500">Assinatura mensal previsível</p>
                                    <div className="pt-8 border-t border-slate-100">
                                        <Button size="lg" onClick={() => setIsPopupOpen(true)} className="w-full font-bold shadow-xl h-14 text-lg rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                                            Começar Agora
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. Final Efficiency Section */}
            <section className="py-20 md:py-32 bg-white">
                <div className="container mx-auto px-6 max-w-4xl text-center">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8 tracking-tight">
                        A Maior Ferramenta de <br />
                        <span className="text-emerald-600">Eficiência Operacional</span> do Mercado.
                    </h2>
                    <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                        <p>
                            Você investe pesado em tráfego pago, mas converte menos de 10% desses leads?
                        </p>
                        <p className="font-bold text-slate-900">
                            Agora, analise o custo-benefício:
                        </p>
                        <div className="grid md:grid-cols-2 gap-8 text-left my-12">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-emerald-600" /> Leads Parados
                                </h4>
                                <p className="text-sm">Milhares de contatos que já interagiram com sua marca, prontos para serem reativados.</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-emerald-600" /> Clientes Inativos
                                </h4>
                                <p className="text-sm">Oportunidades de upsell e recompra com uma simples campanha segmentada, sem custo de aquisição (CAC).</p>
                            </div>
                        </div>
                        <p>
                            Disparos inteligentes são a máquina tática que transforma o custo do seu marketing em lucro direto.
                            O DisparaLead te entrega a previsibilidade de custos e a inteligência de dados que seu time precisa
                            para maximizar o LTV (Lifetime Value) da sua base.
                        </p>
                    </div>
                </div>
            </section >

            {/* Footer */}
            < footer className="bg-slate-50 border-t border-slate-200 py-20" >
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-900 p-1.5 rounded-lg">
                                <img src="/icon white.png" className="h-6 w-auto brightness-0 invert" />
                            </div>
                            <span className="text-xl font-bold text-slate-900">DisparaLead</span>
                        </div>
                        <div className="text-slate-500 text-sm">
                            © {new Date().getFullYear()} DisparaLead. Todos os direitos reservados.
                        </div>
                    </div>
                </div>
            </footer >

            {/* Diagnostic Popup */}
            <DiagnosticPopup open={isPopupOpen} onOpenChange={setIsPopupOpen} />
        </div >
    );
};

export default LandingPage;
