import { Client } from "@upstash/qstash";

const QSTASH_TOKEN = import.meta.env.VITE_QSTASH_TOKEN;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Initialize the client
const client = new Client({
    token: QSTASH_TOKEN,
});

interface EnqueueParams {
    messageId: string;
    phoneNumber: string;
    messageContent: string;
    instanceName: string;
    campaignId: string;
    tenantId: string;
    delay?: number; // in seconds
    notBefore?: number; // unix timestamp in seconds
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio';
    destinationUrl?: string; // Optional: Override default destination
    label?: string; // Campaign ID for bulk cancellation
}

export const qstashClient = {
    /**
     * Enqueues a single message to QStash
     */
    async enqueueMessage(params: EnqueueParams) {
        const destinationUrl = params.destinationUrl || `${SUPABASE_URL}/functions/v1/process-message`;

        try {
            const result = await client.publishJSON({
                url: destinationUrl,
                body: params,
                delay: params.delay,
                notBefore: params.notBefore,
                retries: 2, // Retry up to 2 times on failure
                headers: params.label ? { "Upstash-Label": params.label } : undefined
            });
            return result;
        } catch (error) {
            console.error("Failed to enqueue message to QStash:", error);
            throw error;
        }
    },

    /**
     * Enqueues a batch of messages to QStash (more efficient for large campaigns)
     */
    async enqueueBatch(messages: EnqueueParams[]) {
        // We assume all messages in a batch likely go to the same place, 
        // but let's handle per-message override to be safe/flexible.

        const batch = messages.map(msg => ({
            url: msg.destinationUrl || `${SUPABASE_URL}/functions/v1/process-message`,
            body: JSON.stringify(msg),
            headers: {
                "Content-Type": "application/json",
                ...(msg.label ? { "Upstash-Label": msg.label } : {})
            },
            delay: msg.delay,
            notBefore: msg.notBefore,
            retries: 2,
        }));

        try {
            // QStash batch limit is usually 100-1000 depending on plan, 
            // let's chunk it to be safe (e.g., 100 at a time)
            const chunkSize = 100;
            const results = [];

            for (let i = 0; i < batch.length; i += chunkSize) {
                const chunk = batch.slice(i, i + chunkSize);
                const result = await client.batch(chunk);
                results.push(...result);
            }

            return results;
        } catch (error) {
            console.error("Failed to batch enqueue messages to QStash:", error);
            throw error;
        }
    }
};
