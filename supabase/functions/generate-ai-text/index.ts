import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { message, count } = await req.json();

        if (!message) {
            return new Response(JSON.stringify({ error: "Message is required" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!OPENROUTER_API_KEY) {
            return new Response(JSON.stringify({ error: "OpenRouter API Key not configured" }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Call OpenRouter
        const variationsCount = count || 1;
        const systemPrompt = `You are an expert copywriter.
    Rewrite the user's WhatsApp message ${variationsCount} times.
    Maintain the exact same meaning, tone, and intent, but vary sentence structure and vocabulary.
    Do NOT change any variables like {name}, {telefone} or [link].
    Output ONLY a JSON array of strings: ["rewrite 1", "rewrite 2", ...].
    Do not output markdown code blocks.`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-lite-preview-02-05:free",
                "messages": [
                    {
                        "role": "system",
                        "content": systemPrompt
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ],
                "response_format": { "type": "json_object" } // Force JSON if supported, or just trust prompt
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("OpenRouter Error:", errorText);
            throw new Error(`OpenRouter API Error: ${aiResponse.statusText}`);
        }

        const aiData = await aiResponse.json();
        let content = aiData.choices?.[0]?.message?.content;

        // Clean markdown if present
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        let variations = [];
        try {
            // Try parsing assuming it's a JSON array
            variations = JSON.parse(content);
            if (!Array.isArray(variations)) {
                // Sometimes it returns { "variations": [...] }
                if (variations.variations && Array.isArray(variations.variations)) {
                    variations = variations.variations;
                } else {
                    variations = [content]; // Fallback
                }
            }
        } catch (e) {
            console.error("Failed to parse AI response:", content);
            variations = [message]; // Fallback to original
        }

        return new Response(JSON.stringify({ variations }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
