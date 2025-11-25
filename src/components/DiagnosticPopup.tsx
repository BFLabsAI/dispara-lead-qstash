import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/services/supabaseClient';
import { getTrackingMetadata } from '@/utils/tracking';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface DiagnosticPopupProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const DiagnosticPopup: React.FC<DiagnosticPopupProps> = ({ open, onOpenChange }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        whatsapp: '',
        nome_empresa: '',
        ja_faz_disparo: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get tracking metadata
            const trackingData = getTrackingMetadata();

            // Insert lead into Supabase
            const { error } = await supabase
                .from('leads_dispara_lead')
                .insert([
                    {
                        ...formData,
                        ...trackingData,
                    },
                ]);

            if (error) {
                console.error('Error submitting lead:', error);
                alert('Erro ao enviar formulário. Por favor, tente novamente.');
                return;
            }

            // Close popup and redirect to thank you page
            onOpenChange(false);
            navigate('/obrigado');
        } catch (error) {
            console.error('Unexpected error:', error);
            alert('Erro inesperado. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-slate-900">
                        Agende seu Diagnóstico Gratuito
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Preencha os dados abaixo e nossa equipe entrará em contato para entender suas necessidades.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo *</Label>
                        <Input
                            id="nome"
                            type="text"
                            required
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            placeholder="Seu nome"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="seu@email.com"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp *</Label>
                        <Input
                            id="whatsapp"
                            type="tel"
                            required
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            placeholder="(11) 99999-9999"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nome_empresa">Nome da Empresa</Label>
                        <Input
                            id="nome_empresa"
                            type="text"
                            value={formData.nome_empresa}
                            onChange={(e) => setFormData({ ...formData, nome_empresa: e.target.value })}
                            placeholder="Sua empresa"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="ja_faz_disparo"
                            checked={formData.ja_faz_disparo}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, ja_faz_disparo: checked as boolean })
                            }
                            disabled={loading}
                        />
                        <Label
                            htmlFor="ja_faz_disparo"
                            className="text-sm font-normal cursor-pointer"
                        >
                            Já faz disparo no WhatsApp?
                        </Label>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                'Agendar Diagnóstico'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
