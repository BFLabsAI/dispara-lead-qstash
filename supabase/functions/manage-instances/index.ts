/// <reference lib="deno.ns" />
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Unauthorized')
        }

        // Check if user is super admin or owner of the tenant
        const { action, tenant_id, instance_name } = await req.json()

        // Verify permissions
        const { data: userProfile } = await supabaseClient
            .from('users_dispara_lead_saas')
            .select('role, is_super_admin, tenant_id')
            .eq('id', user.id)
            .single()

        const isSuperAdmin = userProfile?.is_super_admin
        const isOwner = userProfile?.role === 'owner' && userProfile?.tenant_id === tenant_id

        if (!isSuperAdmin && !isOwner) {
            throw new Error('Forbidden: You do not have permission to manage instances for this tenant')
        }

        const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
        const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')

        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
            throw new Error('Server configuration error: Evolution API not configured')
        }

        if (action === 'create') {
            // 1. Create instance in Evolution API
            const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY
                },
                body: JSON.stringify({
                    instanceName: instance_name,
                    token: crypto.randomUUID(), // Generate a random token for the instance
                    qrcode: true
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(`Evolution API Error: ${result.message || response.statusText}`)
            }

            // 2. Save to Database
            const { data: instance, error: dbError } = await supabaseClient
                .from('instances_dispara_lead_saas')
                .insert({
                    tenant_id: tenant_id,
                    instance_name: instance_name,
                    status: 'created',
                    connection_status: 'disconnected',
                    api_key: result.hash?.apikey || result.token // Store the instance token if needed
                })
                .select()
                .single()

            if (dbError) throw dbError

            return new Response(
                JSON.stringify(instance),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'delete') {
            // 1. Delete from Evolution API
            const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instance_name}`, {
                method: 'DELETE',
                headers: {
                    'apikey': EVOLUTION_API_KEY
                }
            })

            if (!response.ok) {
                // If 404, maybe it's already gone, so we proceed to delete from DB
                if (response.status !== 404) {
                    const result = await response.json()
                    throw new Error(`Evolution API Error: ${result.message || response.statusText}`)
                }
            }

            // 2. Delete from Database
            const { error: dbError } = await supabaseClient
                .from('instances_dispara_lead_saas')
                .delete()
                .eq('instance_name', instance_name)
                .eq('tenant_id', tenant_id)

            if (dbError) throw dbError

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error('Invalid action')

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
