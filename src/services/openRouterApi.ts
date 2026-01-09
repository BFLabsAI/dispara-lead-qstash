import { supabase } from '@/services/supabaseClient';

// Checking file content, interfaces are likely exported from here.

export interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OpenRouterResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
    }[];
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Key is now managed by Supabase Edge Function


export const AVAILABLE_MODELS = [
    { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', userSlug: 'x-ai/grok-4.1-fast' },
    { id: 'google/gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite', userSlug: 'google/gemini-2.5-flash-lite' },
    { id: 'openai/gpt-4.1-nano', name: 'GPT 4.1 Nano', userSlug: 'openai/gpt-4.1-nano' },
];

// Helper to get the actual API slug from the user's requested ID
export function getModelId(userSlug: string): string {
    // For now, we will try to use the userSlug directly if not found in our map, 
    // but ideally we map them to the exact OpenRouter model IDs.
    // Since the user gave specific strings, I'll assume those MIGHT be the IDs, 
    // but I'll provide a fallback to common ones if I know them.

    // Let's trust the user's strings for now as requested, but I'll add the specific ones I know are correct.
    // Actually, the user said "the models that must be available... are [list]". 
    // I will use their strings as the IDs to send to the API, assuming they are correct or aliases.
    return userSlug;
}

export async function sendMessageToOpenRouter(
    messages: OpenRouterMessage[],
    model: string,
    siteUrl: string = 'http://localhost:3000',
    siteName: string = 'DisparaLead'
): Promise<string> {
    try {
        const session = await supabase.auth.getSession();
        console.log("Client Auth Session:", session.data.session ? "Active" : "None");

        const { data, error } = await supabase.functions.invoke('copy-agent-chat', {
            body: {
                model: model,
                messages: messages,
            },
        });

        if (error) {
            console.error('Edge Function Invoke Error Object:', error);
            // Check if it's a FunctionsHttpError to extract body
            if (error instanceof Error && 'context' in error) {
                // @ts-ignore - Supabase error wrapper might have context
                console.error('Function Error Context:', error.context);
            }
            throw new Error(`Edge Function Error: ${error.message} (Status: ${error.code || 'Unknown'})`);
        }

        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response choices returned from OpenRouter');
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error sending message to OpenRouter:', error);
        throw error;
    }
}
