
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

// Placeholder key - should be replaced by user or env var
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';

export const AVAILABLE_MODELS = [
    { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', userSlug: 'google/gemini-2.5-flash-lite' },
    { id: 'x-ai/grok-4-fast', name: 'Grok 4 Fast', userSlug: 'x-ai/grok-4-fast' },
    { id: 'openrouter/sherlock-think-alpha', name: 'Sherlock Think Alpha', userSlug: 'openrouter/sherlock-think-alpha' },
    { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat V3', userSlug: 'deepseek/deepseek-chat-v3-0324' },
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
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': siteUrl,
                'X-Title': siteName,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenRouter API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data: OpenRouterResponse = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response choices returned from OpenRouter');
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error sending message to OpenRouter:', error);
        throw error;
    }
}
