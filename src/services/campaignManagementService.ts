import { supabase, SUPABASE_URL } from './supabaseClient';
import { qstashClient } from './qstashClient';
import { showSuccess, showError } from '../utils/toast';

export const campaignManagementService = {
    /**
     * Pause a campaign:
     * 1. Cancel pending messages in QStash via Label
     * 2. Update Campaign status to 'paused'
     * 3. Update 'queued' messages to 'paused' in DB
     */
    async pauseCampaign(campaignId: string) {
        try {
            // 1. Cancel in QStash
            // We use the REST API directly or SDK if available. 
            // SDK `client.messages.delete({ label: ... })`? 
            // qstashClient currently wraps `publishJSON` and `batch`. 
            // We will add `cancelAllByLabel` to qstashClient or call API here.
            // Let's assume we update qstashClient first or just fetch here.
            // Fetching here for speed.
            const QSTASH_TOKEN = import.meta.env.VITE_QSTASH_TOKEN;
            await fetch(`https://qstash.upstash.io/v2/messages?label=${campaignId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${QSTASH_TOKEN}`
                }
            });

            // 2. Update Campaign Level
            const { error: campError } = await supabase
                .from('campaigns_dispara_lead_saas_02')
                .update({ status: 'paused' })
                .eq('id', campaignId);

            if (campError) throw campError;

            // 3. Update Message Logs Level (only those that are queued)
            // We update them to 'paused' so we know which ones to resume later.
            const { error: logsError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .update({ status: 'paused' })
                .eq('campaign_id', campaignId)
                .eq('status', 'queued');

            if (logsError) throw logsError;

            showSuccess('Campanha pausada com sucesso.');
        } catch (error) {
            console.error('Error pausing campaign:', error);
            showError('Erro ao pausar campanha.');
            throw error;
        }
    },

    /**
     * Cancel a campaign:
     * 1. Cancel pending messages in QStash via Label
     * 2. Update Campaign status to 'cancelled'
     * 3. Update 'queued'/'paused' messages to 'cancelled' in DB
     */
    async cancelCampaign(campaignId: string) {
        try {
            const QSTASH_TOKEN = import.meta.env.VITE_QSTASH_TOKEN;
            await fetch(`https://qstash.upstash.io/v2/messages?label=${campaignId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${QSTASH_TOKEN}`
                }
            });

            const { error: campError } = await supabase
                .from('campaigns_dispara_lead_saas_02')
                .update({ status: 'cancelled', completed_at: new Date().toISOString() })
                .eq('id', campaignId);

            if (campError) throw campError;

            const { error: logsError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .update({ status: 'cancelled' })
                .eq('campaign_id', campaignId)
                .in('status', ['queued', 'paused']);

            if (logsError) throw logsError;

            showSuccess('Campanha cancelada.');
        } catch (error) {
            console.error('Error cancelling campaign:', error);
            showError('Erro ao cancelar campanha.');
            throw error;
        }
    },

    /**
     * Resume a campaign:
     * 1. Fetch 'paused' messages from DB
     * 2. Re-enqueue them to QStash (via enqueue-campaign Edge Function)
     * 3. Update DB logs to 'queued'
     * 4. Update Campaign status to 'processing'
     */
    async resumeCampaign(campaignId: string) {
        try {
            // 1. Fetch Paused Messages
            // We need to construct the payload for QStash again.
            // Payload needs: messageId, phoneNumber, messageContent, instanceName, campaignId, tenantId, etc.
            // We can reconstruct this from the `message_logs` table.

            // Pagination might be needed if massive, but for now let's assume reasonable size or do it in chunks.
            const { data: pausedMessages, error: fetchError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .select('*')
                .eq('campaign_id', campaignId)
                .eq('status', 'paused');

            if (fetchError) throw fetchError;
            if (!pausedMessages || pausedMessages.length === 0) {
                showSuccess('Nenhuma mensagem pausada para retomar.');
                // Just update status to completed or processing?
                await supabase.from('campaigns_dispara_lead_saas_02').update({ status: 'processing' }).eq('id', campaignId);
                return;
            }

            // 2. Prepare Payload
            // Note: We MUST use the SAME messageId to preserve Idempotency/Logs?
            // Yes, if we reuse messageId, `process-message` performs idempotency check.
            // But `process-message` logic: "if existingLog.status === 'sent' -> skip".
            // Our status is 'paused'. So it will PROCEED.
            // Good.

            const messagesToEnqueue = pausedMessages.map((msg, index) => {
                // --- Recalculate Delays for Smart Resume ---
                // To avoid "bursts" (sending all old scheduled msgs at once), we must reschedule them
                // starting from NOW, respecting the original interval (or a default safe interval).

                // We'll apply a default random jitter between 30-60s if we can't find the original config easily,
                // or just space them out by 10 seconds to be safe/smooth.
                // Better: Use a fixed stagger of 15 seconds between messages to guarantee flow.
                const staggerSeconds = 15;
                const baseTime = Date.now();
                const newDelay = (index * staggerSeconds * 1000) + Math.floor(Math.random() * 5000); // 15s * index + 0-5s jitter
                const newScheduledTime = baseTime + newDelay;

                // Determine AI usage from metadata
                const useAI = msg.metadata?.usaria || msg.metadata?.ai_rewritten || false;

                return {
                    messageId: msg.id, // Reuse ID for idempotency/logs
                    phoneNumber: msg.phone_number,
                    messageContent: msg.message_content,
                    instanceName: msg.instance_name,
                    campaignId: msg.campaign_id,
                    tenantId: msg.tenant_id,
                    mediaUrl: msg.media_url,
                    mediaType: msg.message_type !== 'texto' ? msg.message_type : undefined,
                    notBefore: Math.floor(newScheduledTime / 1000), // Smart Resume: Future timestamp
                    label: campaignId,
                    useAI: useAI // Explicitly pass AI flag
                };
            });

            // 3. Re-equeue via Edge Function
            const { data: enqueueData, error: enqueueError } = await supabase.functions.invoke('enqueue-campaign', {
                body: { messages: messagesToEnqueue }
            });

            if (enqueueError) throw enqueueError;
            if (enqueueData && !enqueueData.success) throw new Error(enqueueData.error);

            // 4. Update Logs to 'queued'
            const { error: updateLogsError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .update({ status: 'queued' })
                .eq('campaign_id', campaignId)
                .eq('status', 'paused');

            if (updateLogsError) throw updateLogsError;

            // 5. Update Campaign Status
            const { error: updateCampError } = await supabase
                .from('campaigns_dispara_lead_saas_02')
                .update({ status: 'processing' })
                .eq('id', campaignId);

            if (updateCampError) throw updateCampError;

            showSuccess(`Retomadas ${messagesToEnqueue.length} mensagens.`);
        } catch (error) {
            console.error('Error resuming campaign:', error);
            showError('Erro ao retomar campanha.');
            throw error;
        }
    },

    /**
     * Update Messages Batch
     * Updates multiple message templates in the logs.
     * Uses `message_type` to distinguish which logs to update.
     */
    async updateCampaignMessages(campaignId: string, messages: any[]) {
        try {
            // Processing: for each message in our sequence, we need to update the corresponding logs.
            // Problem: If there are multiple 'texto' messages, how do we know which one is which?
            // Heuristic: user is editing Type X. We update ALL logs of Type X in this campaign.
            // This assumes 1:1 mapping of types. If 2 'texto', both get updated to the latest.

            for (const msg of messages) {
                const updateData: any = {
                    message_content: msg.content,
                    message_type: msg.type
                };

                if (msg.mediaUrl !== undefined) {
                    updateData.media_url = msg.mediaUrl;
                }

                // Update WHERE campaign_id = X AND message_type = Y
                // This targets the specific "Step" by type.

                const { error } = await supabase
                    .from('message_logs_dispara_lead_saas_03')
                    .update(updateData)
                    .eq('campaign_id', campaignId)
                    .eq('message_type', msg.originalType || msg.type) // Match original type in DB
                    .in('status', ['queued', 'paused']);

                if (error) throw error;
            }

            showSuccess('Conteúdo atualizado com sucesso.');
        } catch (error) {
            console.error('Error updating content:', error);
            showError('Erro ao atualizar conteúdo.');
            throw error;
        }
    }
};
