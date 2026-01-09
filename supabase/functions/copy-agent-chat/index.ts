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
        const { messages, model } = await req.json();

        if (!messages) {
            return new Response(JSON.stringify({ error: "Messages are required" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const apiKey = Deno.env.get('OPENROUTER_API_KEY');

        console.log("API Key configured:", !!apiKey);
        if (apiKey) {
            console.log("API Key prefix:", apiKey.substring(0, 10) + "...");
            console.log("API Key length:", apiKey.length);
        }

        if (!apiKey) {
            console.error("Missing OPENROUTER_API_KEY env var");
            return new Response(JSON.stringify({
                error: "Configuration Error: OpenRouter API Key is missing on server."
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log("Using model:", model || "fallback-model");

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://disparalead.com",
                "X-Title": "Dispara Lead"
            },
            body: JSON.stringify({
                model: model || "google/gemini-2.5-flash-lite",
                messages: messages,
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("OpenRouter API Error Status:", aiResponse.status);
            console.error("OpenRouter API Error Body:", errorText);

            let errorMessage = `OpenRouter API Error: ${aiResponse.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error && errorJson.error.message) {
                    errorMessage += ` - ${errorJson.error.message}`;
                } else {
                    errorMessage += ` - ${errorText}`;
                }
            } catch (e) {
                errorMessage += ` - ${errorText}`;
            }

            return new Response(JSON.stringify({ error: errorMessage }), {
                status: aiResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const data = await aiResponse.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
