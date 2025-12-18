import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const email = 'designer@escolapreach.com.br'
        console.log(`Deleting user with email: ${email}`)

        // 1. Delete from public table
        const { error: publicError } = await supabaseAdmin
            .from('users_dispara_lead_saas_02')
            .delete()
            .eq('email', email)

        // 2. Delete from auth (just in case)
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        const user = users?.find(u => u.email === email)

        let authError = null
        if (user) {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
            authError = error
        }

        return new Response(
            JSON.stringify({
                message: 'Cleanup executed',
                publicError,
                authError,
                userFound: !!user
            }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
