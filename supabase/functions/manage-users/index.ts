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

        // Check if user is super admin
        const { data: isSuperAdmin } = await supabaseClient.rpc('is_super_admin')

        if (!isSuperAdmin) {
            throw new Error('Forbidden: Only Super Admins can perform this action')
        }

        const { action, tenant_id, email, full_name, role } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        if (action === 'invite') {
            if (!email || !tenant_id) {
                throw new Error('Email and Tenant ID are required')
            }

            // 1. Invite user via Supabase Auth
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

            if (authError) throw authError

            const newUserId = authData.user.id

            // 2. Create user record in public table
            const { error: dbError } = await supabaseAdmin
                .from('users_dispara_lead_saas_02')
                .insert({
                    id: newUserId,
                    tenant_id: tenant_id,
                    email: email,
                    full_name: full_name,
                    role: role || 'member',
                    is_super_admin: false,
                    created_at: new Date().toISOString()
                })

            if (dbError) {
                // If DB insert fails, we might want to delete the auth user to keep consistency, 
                // but for now let's just throw error.
                console.error('Error creating user record:', dbError)
                throw new Error(`User invited but failed to create record: ${dbError.message}`)
            }

            return new Response(
                JSON.stringify({ message: 'User invited successfully', user: authData.user }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        throw new Error('Invalid action')

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
