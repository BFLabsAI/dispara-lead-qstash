/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Client } from "https://esm.sh/@upstash/qstash@2.7.17";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const QSTASH_URL = Deno.env.get('QSTASH_URL') ?? 'https://qstash.upstash.io';
const QSTASH_TOKEN = Deno.env.get('QSTASH_TOKEN') ?? '';
const PROCESS_MESSAGE_URL = Deno.env.get('PROCESS_MESSAGE_URL') ?? ''; // URL of the process-message function

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const qstash = new Client({ token: QSTASH_TOKEN });

const PROCESS_MESSAGE_URL_AI = `${SUPABASE_URL}/functions/v1/process-message-ai`;

Deno.serve(async (req) => {
    try {
        // 1. Fetch pending schedules that are due
        const { data: schedules, error: fetchError } = await supabase
            .from('schedules_dispara_lead_saas_02')
            .select('*, tenants_dispara_lead_saas_02(slug)')
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
                .from('schedules_dispara_lead_saas_02')
                .update({ status: 'processing' })
                .eq('id', campaign.id);

            let scheduledCount = 0;
            let errorCount = 0;

            const contacts = typeof campaign.contacts_json === 'string'
                ? JSON.parse(campaign.contacts_json)
                : campaign.contacts_json;

            const templates = typeof campaign.message_template === 'string'
                ? JSON.parse(campaign.message_template)
                : campaign.message_template;

            const instances = campaign.instance_names || [];

            // 3. Fan-out to QStash
            // We create one job per contact per template

            const delayMin = campaign.delay_min || 3;
            const delayMax = campaign.delay_max || 8;
            let accumulatedDelay = 0;
            const baseTime = Date.now();

            const useAI = campaign.content_configuration?.use_ai || campaign.use_ai || false;

            const logEntries = [];
            const qstashPayloads = [];

            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                const instanceName = instances[i % instances.length];

                for (const template of templates) {
                    let text = template.text;
                    const hasText = text && text.trim().length > 0;

                    // Simple variable replacement
                    text = text.replace(/{nome}/g, contact.nome || '');
                    text = text.replace(/{telefone}/g, contact.telefone || '');
                    // Also support @variable syntax if used
                    text = text.replace(/@(\w+)/g, (_: string, key: string) => {
                        return contact[key] || "";
                    });

                    const messageId = crypto.randomUUID();

                    // Calculate Delay
                    const randomDelay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
                    accumulatedDelay += randomDelay;
                    const deliveryTime = baseTime + accumulatedDelay;

                    const shouldUseAI = useAI && hasText;

                    logEntries.push({
                        id: messageId,
                        tenant_id: campaign.tenant_id,
                        instance_name: instanceName,
                        phone_number: contact.telefone,
                        message_content: text,
                        status: 'queued', // Correctly mark as queued immediately
                        campaign_name: campaign.campaign_name,
                        campaign_type: 'scheduled',
                        metadata: {
                            schedule_id: campaign.id,
                            ai_rewritten: shouldUseAI
                        },
                        created_at: new Date().toISOString(),
                        scheduled_for: new Date(deliveryTime).toISOString()
                    });

                    qstashPayloads.push({
                        messageId: messageId,
                        phoneNumber: contact.telefone,
                        messageContent: text,
                        instanceName: instanceName,
                        campaignId: campaign.id,
                        tenantId: campaign.tenant_id,
                        mediaUrl: template.mediaUrl,
                        mediaType: template.mediaType,
                        notBefore: Math.floor(deliveryTime / 1000),
                        destinationUrl: shouldUseAI ? PROCESS_MESSAGE_URL_AI : PROCESS_MESSAGE_URL
                    });
                }
            }

            // Insert all logs in one go
            const { error: insertError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .insert(logEntries);

            if (insertError) {
                console.error('Failed to insert logs:', insertError);
                // If we can't insert logs, we shouldn't schedule messages as we can't track them.
                // Mark campaign as failed?
                await supabase
                    .from('schedules_dispara_lead_saas_02')
                    .update({ status: 'failed', execution_log: 'Failed to insert message logs: ' + insertError.message })
                    .eq('id', campaign.id);
                continue;
            }

            // Now publish to QStash
            // We can use qstash.batch if available, or parallel promises
            // QStash batch limit is 100. If we have more, we need to chunk.

            const chunkSize = 100;
            for (let i = 0; i < qstashPayloads.length; i += chunkSize) {
                const chunk = qstashPayloads.slice(i, i + chunkSize);

                // Construct batch request
                const batch = chunk.map(p => {
                    const dest = p.destinationUrl || PROCESS_MESSAGE_URL;
                    // Remove destinationUrl from body so it doesn't clutter payload
                    const { destinationUrl, ...rest } = p;

                    return {
                        url: dest,
                        body: JSON.stringify(rest),
                        headers: { "Content-Type": "application/json" },
                        notBefore: p.notBefore
                    };
                });

                try {
                    await qstash.batch(batch);
                    scheduledCount += chunk.length;
                    console.log(`[Process-Scheduler] Successfully batched ${chunk.length} messages for campaign ${campaign.id}`);
                } catch (err) {
                    console.error(`[Process-Scheduler] QStash batch error for campaign ${campaign.id}:`, err);
                    errorCount += chunk.length;
                }
            }

            // 4. Update schedule status
            await supabase
                .from('schedules_dispara_lead_saas_02')
                .update({
                    status: 'completed', // We marked it completed as "scheduling" is done. The messages are async.
                    execution_log: `Scheduled ${scheduledCount} messages via QStash. Errors: ${errorCount}`
                })
                .eq('id', campaign.id);

            results.push({ id: campaign.id, scheduled: scheduledCount, errors: errorCount });
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
