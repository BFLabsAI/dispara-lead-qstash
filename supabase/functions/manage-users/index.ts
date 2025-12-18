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

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Determine User Role & Tenant
        // We first check if they are a super admin via RPC
        const { data: isSuperAdmin } = await supabaseClient.rpc('is_super_admin')

        // We also fetch their profile to check for tenant admin status
        const { data: requesterProfile } = await supabaseAdmin
            .from('users_dispara_lead_saas_02')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single()

        const requesterRole = requesterProfile?.role
        const requesterTenantId = requesterProfile?.tenant_id

        // Parse Request
        const { action, tenant_id, email, full_name, role, userId, redirectTo } = await req.json()

        // --- AUTHORIZATION CHECK ---
        // Basic rule: Must be Super Admin OR (Tenant Owner/Admin acting on SAME tenant)
        let isAuthorized = false

        if (isSuperAdmin) {
            isAuthorized = true
        } else if (requesterRole === 'owner' || requesterRole === 'admin') {
            // Must define which tenant they are acting on
            // For 'invite': we check the payload's tenant_id
            // For 'delete': we check the target user's tenant_id (fetched later)

            // Initial check: if payload has tenant_id, it must match requester's
            if (tenant_id && tenant_id !== requesterTenantId) {
                throw new Error('Forbidden: You can only manage your own tenant')
            }
            isAuthorized = true
        }

        if (!isAuthorized) {
            throw new Error(`Forbidden: Insufficient permissions. Role: ${requesterRole}, Tenant: ${requesterTenantId}, IsSuperAdmin: ${isSuperAdmin}`)
        }

        // --- ACTION: INVITE ---
        if (action === 'invite') {
            if (!email || !tenant_id) {
                throw new Error('Email and Tenant ID are required')
            }

            // Double check for non-super-admins
            if (!isSuperAdmin && tenant_id !== requesterTenantId) {
                throw new Error('Forbidden: Tenant mismatch')
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

        // --- ACTION: RESEND INVITE ---
        if (action === 'resend_invite') {
            if (!email) throw new Error('Email is required');

            const options: any = {};
            if (redirectTo) options.redirectTo = redirectTo;

            // Reuse existing invite logic - Supabase handles resends by sending a new magic link
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, options);
            if (error) throw error;

            return new Response(
                JSON.stringify({ message: 'Invite resent successfully' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // --- ACTION: DELETE ---
        if (action === 'delete') {
            if (!userId) {
                throw new Error('User ID is required for deletion')
            }

            // 1. Fetch target user to verify tenant ownership
            const { data: targetUser, error: fetchError } = await supabaseAdmin
                .from('users_dispara_lead_saas_02')
                .select('tenant_id, role')
                .eq('id', userId)
                .single()

            if (fetchError || !targetUser) {
                // If not in public table, try deleting from Auth just in case
                await supabaseAdmin.auth.admin.deleteUser(userId);
                return new Response(JSON.stringify({ message: 'User deleted (was orphan)' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }

            // 2. Security Check for Deletion
            if (!isSuperAdmin) {
                if (targetUser.tenant_id !== requesterTenantId) {
                    throw new Error(`Forbidden: You cannot delete users from other tenants. MyTenant: ${requesterTenantId}, TargetTenant: ${targetUser.tenant_id}`)
                }
                if (userId === user.id) {
                    throw new Error('Forbidden: You cannot delete your own account')
                }
            }

            // 3. Handle Owner Deletion (Cascade Tenant)
            // If the user to be deleted is the owner of the tenant, we might need to delete the tenant
            // OR forbid it? User requested to fix "Database Error". 
            // Often, deleting the OWNER means deleting the account.
            if (targetUser.role === 'owner') {
                // Check if there are other users? (Optional safety)
                // For now, we assume deleting owner -> delete tenant attempts to sweep everything.
                console.log(`Deleting tenant ${targetUser.tenant_id} for owner ${userId}`);
                const { error: tenantDelError } = await supabaseAdmin
                    .from('tenants_dispara_lead_saas_02')
                    .delete()
                    .eq('id', targetUser.tenant_id);

                if (tenantDelError) {
                    console.error('Error deleting tenant:', tenantDelError);
                    // If tenant delete fails, we might still fail on user delete, but proceed to try.
                }
            }

            // 4. Delete from Public Table First (Explicit cleanup)
            const { error: publicDelError } = await supabaseAdmin
                .from('users_dispara_lead_saas_02')
                .delete()
                .eq('id', userId)

            if (publicDelError) {
                console.error('Error deleting public user record:', publicDelError);
                // If it's a FK error and we haven't handled it (e.g. not owner?), throw.
                if (publicDelError.message.includes('foreign key constraint')) {
                    throw new Error(`Cannot delete user: They have related data (Campaigns, etc.) that prevents deletion. Error: ${publicDelError.message}`);
                }
            }

            // 5. Delete from Auth
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
            if (deleteAuthError) {
                if (!deleteAuthError.message.includes("User not found") && !deleteAuthError.message.includes("not find user")) {
                    throw deleteAuthError;
                }
            }

            return new Response(
                JSON.stringify({ message: 'User deleted successfully' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        throw new Error('Invalid action')

    } catch (error) {
        return new Response(
            JSON.stringify({ error: `Manage Users Error: ${error.message}` }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    }
})
