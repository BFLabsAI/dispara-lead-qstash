import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft, MessageCircle } from 'lucide-react';

const Obrigado = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-16 text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                        Obrigado pelo seu interesse!
                    </h1>

                    <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                        Recebemos suas informações com sucesso. Nossa equipe entrará em contato em breve
                        para agendar seu diagnóstico gratuito e mostrar como o DisparaLead pode transformar
                        suas vendas.
                    </p>

                    <div className="bg-emerald-50 rounded-2xl p-6 mb-10 border border-emerald-100">
                        <p className="text-sm font-bold text-emerald-900 mb-2">Próximos Passos:</p>
                        <ul className="text-left text-sm text-emerald-700 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-600 mt-0.5">•</span>
                                <span>Verifique seu e-mail (inclusive spam) para confirmação</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-600 mt-0.5">•</span>
                                <span>Entraremos em contato via WhatsApp nas próximas 24 horas</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-600 mt-0.5">•</span>
                                <span>Prepare suas dúvidas sobre disparo e automação no WhatsApp</span>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/">
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-14 px-8 rounded-full font-bold border-2 border-slate-200 hover:border-slate-300 w-full sm:w-auto"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Voltar ao Início
                            </Button>
                        </Link>
                        <a
                            href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Acabei%20de%20agendar%20meu%20diagn%C3%B3stico"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                size="lg"
                                className="h-14 px-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto"
                            >
                                <MessageCircle className="mr-2 h-5 w-5" />
                                Falar no WhatsApp
                            </Button>
                        </a>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <Link to="/" className="text-slate-500 hover:text-slate-700 text-sm font-medium">
                        DisparaLead © {new Date().getFullYear()}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Obrigado;
