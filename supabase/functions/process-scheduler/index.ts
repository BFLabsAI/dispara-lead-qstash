/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? 'https://api.bflabs.com.br';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '9a38befe6a9f6938cd70cb769c66357d';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
    try {
        // 1. Fetch pending schedules that are due
        const { data: schedules, error: fetchError } = await supabase
            .from('schedules_dispara_lead_saas')
            .select('*, tenants_dispara_lead_saas(slug)')
            .eq('status', 'pending')
            .lte('scheduled_at', new Date().toISOString());

        if (fetchError) throw fetchError;

        if (!schedules || schedules.length === 0) {
            return new Response(JSON.stringify({ message: 'No schedules to process' }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const results = [];

        // 2. Process each schedule
        for (const campaign of schedules) {
            // Mark as processing
            await supabase
                .from('schedules_dispara_lead_saas')
                .update({ status: 'processing' })
                .eq('id', campaign.id);

            let successCount = 0;
            let failCount = 0;
            const logs = [];

            const contacts = typeof campaign.contacts_json === 'string'
                ? JSON.parse(campaign.contacts_json)
                : campaign.contacts_json;

            const templates = typeof campaign.message_template === 'string'
                ? JSON.parse(campaign.message_template)
                : campaign.message_template;

            const instances = campaign.instance_names || [];

            // 3. Send messages
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                const instanceName = instances[i % instances.length]; // Round-robin

                try {
                    // Verify instance belongs to tenant (optional security check, but RLS handles it mostly)
                    // For now, we assume the instance_name stored in schedule is valid for the tenant

                    for (const template of templates) {
                        let text = template.text;
                        // Simple variable replacement
                        text = text.replace(/{nome}/g, contact.nome || '');
                        text = text.replace(/{telefone}/g, contact.telefone || '');

                        const body = {
                            number: contact.telefone,
                            text: text,
                            instanceName: instanceName
                        };

                        // Call Evolution API
                        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': EVOLUTION_API_KEY
                            },
                            body: JSON.stringify(body)
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(result.message || 'Failed to send');
                        }

                        // Log success
                        await supabase.from('message_logs_dispara_lead_saas').insert({
                            tenant_id: campaign.tenant_id,
                            instance_name: instanceName,
                            phone_number: contact.telefone,
                            message_content: text,
                            status: 'sent',
                            campaign_name: campaign.campaign_name,
                            campaign_type: 'scheduled',
                            metadata: {
                                schedule_id: campaign.id,
                                evolution_id: result.key?.id
                            }
                        });
                        successCount++;
                    }
                } catch (error) {
                    console.error(`Failed to send to ${contact.telefone}:`, error);
                    failCount++;
                    // Log failure
                    await supabase.from('message_logs_dispara_lead_saas').insert({
                        tenant_id: campaign.tenant_id,
                        instance_name: instanceName,
                        phone_number: contact.telefone,
                        message_content: 'Error sending message',
                        status: 'failed',
                        campaign_name: campaign.campaign_name,
                        campaign_type: 'scheduled',
                        error_message: (error as Error).message,
                        metadata: {
                            schedule_id: campaign.id
                        }
                    });
                }

                // Rate limiting (simple)
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // 4. Update schedule status
            await supabase
                .from('schedules_dispara_lead_saas')
                .update({
                    status: 'completed',
                    execution_log: `Processed ${contacts.length} contacts. Success: ${successCount}, Failed: ${failCount}`
                })
                .eq('id', campaign.id);

            results.push({ id: campaign.id, success: successCount, failed: failCount });
        }

        return new Response(JSON.stringify({ processed: results }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
