import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Bell, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/services/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { PhoneInputSection } from "@/components/settings/PhoneInputSection";

export default function SettingsPage() {
    // Response Notifications (Sales)
    const [responsePhones, setResponsePhones] = useState<string[]>([]);
    const [newResponsePhone, setNewResponsePhone] = useState("");
    const [responseCountryCode, setResponseCountryCode] = useState("55");

    // Report Notifications (Management)
    const [reportPhones, setReportPhones] = useState<string[]>([]);
    const [newReportPhone, setNewReportPhone] = useState("");
    const [reportCountryCode, setReportCountryCode] = useState("55");

    const [loading, setLoading] = useState(true);
    const [savingResponse, setSavingResponse] = useState(false);
    const [savingReport, setSavingReport] = useState(false);

    // State to handle missing rows
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [settingsExist, setSettingsExist] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData, error: userError } = await supabase
                .from("users_dispara_lead_saas_02")
                .select("tenant_id")
                .eq("id", user.id)
                .single();

            if (userError || !userData?.tenant_id) {
                console.error("Tenant Fetch Error:", userError);
                throw new Error("Conta não encontrada.");
            }

            setTenantId(userData.tenant_id);

            const { data, error } = await supabase
                .from("company_settings_dispara_lead_saas_02")
                .select("response_notification_phones, report_notification_phones")
                .eq("tenant_id", userData.tenant_id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setSettingsExist(true);
                if (data.response_notification_phones) setResponsePhones(data.response_notification_phones);
                if (data.report_notification_phones) setReportPhones(data.report_notification_phones);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            // toast.error("Erro ao carregar configurações."); 
        } finally {
            setLoading(false);
        }
    };

    // Mask Logic: (DD) 9 9999-9999
    const formatPhone = (value: string) => {
        const v = value.replace(/\D/g, "");
        const limit = v.slice(0, 11);
        if (limit.length === 0) return "";
        if (limit.length <= 2) return `(${limit}`;
        if (limit.length <= 3) return `(${limit.slice(0, 2)}) ${limit.slice(2)}`;
        if (limit.length <= 7) return `(${limit.slice(0, 2)}) ${limit.slice(2, 3)} ${limit.slice(3)}`;
        return `(${limit.slice(0, 2)}) ${limit.slice(2, 3)} ${limit.slice(3, 7)}-${limit.slice(7)}`;
    };

    const handleSaveResponse = async () => {
        if (!tenantId) {
            toast.error("Erro: ID da conta não identificado. Recarregue a página.");
            return;
        }

        // Auto-add pending phone if user forgot to click "Adicionar"
        let currentPhones = [...responsePhones];
        const rawNew = newResponsePhone.replace(/\D/g, "");

        if (rawNew.length > 0) {
            if (rawNew.length < 10) {
                toast.error("O número digitado no campo de texto está incompleto.");
                return;
            }
            const fullNumber = responseCountryCode + rawNew;
            if (!currentPhones.includes(fullNumber)) {
                currentPhones.push(fullNumber);
                setResponsePhones(currentPhones);
                setNewResponsePhone("");
            }
        }

        setSavingResponse(true);
        try {
            const payload = {
                response_notification_phones: currentPhones
            };

            if (settingsExist) {
                const { error } = await supabase
                    .from("company_settings_dispara_lead_saas_02")
                    .update(payload)
                    .eq("tenant_id", tenantId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("company_settings_dispara_lead_saas_02")
                    .insert([{ tenant_id: tenantId, ...payload }]);
                if (error) throw error;
                setSettingsExist(true);
            }
            toast.success("Notificações de Resposta salvas!");
        } catch (error) {
            console.error("Error saving response settings:", error);
            toast.error("Erro ao salvar.");
        } finally {
            setSavingResponse(false);
        }
    };

    const handleSaveReport = async () => {
        if (!tenantId) {
            toast.error("Erro: ID da conta não identificado. Recarregue a página.");
            return;
        }

        // Auto-add pending phone if user forgot to click "Adicionar"
        let currentPhones = [...reportPhones];
        const rawNew = newReportPhone.replace(/\D/g, "");

        if (rawNew.length > 0) {
            if (rawNew.length < 10) {
                toast.error("O número digitado no campo de texto está incompleto.");
                return;
            }
            const fullNumber = reportCountryCode + rawNew;
            if (!currentPhones.includes(fullNumber)) {
                currentPhones.push(fullNumber);
                setReportPhones(currentPhones);
                setNewReportPhone("");
            }
        }

        setSavingReport(true);
        try {
            const payload = {
                report_notification_phones: currentPhones
            };

            if (settingsExist) {
                const { error } = await supabase
                    .from("company_settings_dispara_lead_saas_02")
                    .update(payload)
                    .eq("tenant_id", tenantId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("company_settings_dispara_lead_saas_02")
                    .insert([{ tenant_id: tenantId, ...payload }]);
                if (error) throw error;
                setSettingsExist(true);
            }
            toast.success("Notificações de Relatório salvas!");
        } catch (error) {
            console.error("Error saving report settings:", error);
            toast.error("Erro ao salvar.");
        } finally {
            setSavingReport(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-start pt-14">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                    <p className="text-muted-foreground mt-2">Gerencie as preferências da sua conta e notificações.</p>
                </div>
            </div>

            <PhoneInputSection
                key="response-notifications"
                title="Notificações de Resposta (Comercial)"
                description="Receba alertas quando um lead responder a uma campanha. Ideal para equipe de vendas."
                icon={Bell}
                phones={responsePhones}
                setPhones={setResponsePhones}
                newPhone={newResponsePhone}
                setNewPhone={setNewResponsePhone}
                countryCode={responseCountryCode}
                setCountryCode={setResponseCountryCode}
                formatPhone={formatPhone}
                onSave={handleSaveResponse}
                saving={savingResponse || loading}
            />

            <PhoneInputSection
                key="report-notifications"
                title="Relatórios de Campanha (Gestão)"
                description="Receba o resumo automático quando uma campanha for finalizada. Ideal para gestores."
                icon={FileBarChart}
                phones={reportPhones}
                setPhones={setReportPhones}
                newPhone={newReportPhone}
                setNewPhone={setNewReportPhone}
                countryCode={reportCountryCode}
                setCountryCode={setReportCountryCode}
                formatPhone={formatPhone}
                onSave={handleSaveReport}
                saving={savingReport || loading}
            />
        </div>
    );
}
