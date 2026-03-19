import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROFILE_TABLE = "users_dispara_lead_saas_02";
const MEMBERSHIP_TABLE = "user_tenant_memberships_dispara_lead_saas_02";

type MembershipRole = "owner" | "admin" | "member";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: MembershipRole | string | null;
  tenant_id: string | null;
  current_tenant_id: string | null;
  is_super_admin: boolean | null;
};

type TenantMembership = {
  user_id: string;
  tenant_id: string;
  role: MembershipRole;
  status: string;
};

const normalizeRole = (
  role: unknown,
  fallback: MembershipRole = "member",
): MembershipRole => {
  if (role === "owner" || role === "admin" || role === "member") {
    return role;
  }

  if (role === "user") {
    return "member";
  }

  return fallback;
};

const getEffectiveTenantId = (
  profile: Pick<UserProfile, "tenant_id" | "current_tenant_id"> | null,
) => profile?.current_tenant_id ?? profile?.tenant_id ?? null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { action, tenant_id, email, full_name, role, userId, redirectTo } =
      await req.json();

    const { data: isSuperAdmin } = await supabaseClient.rpc("is_super_admin");

    const { data: requesterProfile, error: requesterProfileError } =
      await supabaseAdmin
        .from(PROFILE_TABLE)
        .select(
          "id, role, tenant_id, current_tenant_id, is_super_admin, email, full_name",
        )
        .eq("id", user.id)
        .maybeSingle();

    if (requesterProfileError) {
      throw requesterProfileError;
    }

    const requesterTenantId = getEffectiveTenantId(requesterProfile);
    const requesterIsSuperAdmin = Boolean(
      isSuperAdmin || requesterProfile?.is_super_admin,
    );

    const getMembership = async (
      memberUserId: string,
      memberTenantId: string,
    ) => {
      const { data, error } = await supabaseAdmin
        .from(MEMBERSHIP_TABLE)
        .select("user_id, tenant_id, role, status")
        .eq("user_id", memberUserId)
        .eq("tenant_id", memberTenantId)
        .maybeSingle();

      if (error) throw error;
      return data as TenantMembership | null;
    };

    const getCurrentTenantMembership = async (
      memberUserId: string,
      memberTenantId: string,
    ) => {
      const membership = await getMembership(memberUserId, memberTenantId);
      if (membership?.status === "active") {
        return membership;
      }

      return null;
    };

    const ensureProfile = async ({
      targetUserId,
      targetEmail,
      targetName,
      targetRole,
      targetTenantId,
      targetIsSuperAdmin,
    }: {
      targetUserId: string;
      targetEmail: string;
      targetName: string;
      targetRole: MembershipRole;
      targetTenantId: string | null;
      targetIsSuperAdmin: boolean;
    }) => {
      const { data: existingProfile, error: existingProfileError } =
        await supabaseAdmin
          .from(PROFILE_TABLE)
          .select(
            "id, email, full_name, role, tenant_id, current_tenant_id, is_super_admin",
          )
          .eq("id", targetUserId)
          .maybeSingle();

      if (existingProfileError) throw existingProfileError;

      if (!existingProfile) {
        const { error: insertError } = await supabaseAdmin.from(PROFILE_TABLE)
          .insert({
            id: targetUserId,
            email: targetEmail,
            full_name: targetName,
            role: targetRole,
            tenant_id: targetTenantId,
            current_tenant_id: targetTenantId,
            is_super_admin: targetIsSuperAdmin,
          });

        if (insertError) throw insertError;
        return;
      }

      const updates: Record<string, unknown> = {
        email: targetEmail,
        full_name: targetName,
      };

      if (targetIsSuperAdmin && !existingProfile.is_super_admin) {
        updates.is_super_admin = true;
      }

      if (!existingProfile.role) {
        updates.role = targetRole;
      }

      if (!existingProfile.tenant_id && targetTenantId) {
        updates.tenant_id = targetTenantId;
      }

      if (!existingProfile.current_tenant_id && targetTenantId) {
        updates.current_tenant_id = targetTenantId;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from(PROFILE_TABLE)
          .update(updates)
          .eq("id", targetUserId);

        if (updateError) throw updateError;
      }
    };

    const ensureMembership = async ({
      targetUserId,
      targetTenantId,
      targetRole,
      invitedBy,
    }: {
      targetUserId: string;
      targetTenantId: string;
      targetRole: MembershipRole;
      invitedBy: string;
    }) => {
      const { error } = await supabaseAdmin
        .from(MEMBERSHIP_TABLE)
        .upsert(
          {
            user_id: targetUserId,
            tenant_id: targetTenantId,
            role: targetRole,
            status: "active",
            invited_by: invitedBy,
          },
          { onConflict: "user_id,tenant_id" },
        );

      if (error) throw error;
    };

    const getTenantScopedRequesterRole = async (
      scopeTenantId: string | null,
    ) => {
      if (!scopeTenantId) {
        return normalizeRole(requesterProfile?.role, "member");
      }

      const membership = await getCurrentTenantMembership(
        user.id,
        scopeTenantId,
      );
      if (membership) {
        return membership.role;
      }

      if (requesterProfile?.tenant_id === scopeTenantId) {
        return normalizeRole(requesterProfile.role, "member");
      }

      return null;
    };

    const resolveTenantScope = (explicitTenantId: string | null) =>
      explicitTenantId ?? requesterTenantId ?? null;

    const authorizeTenantAction = async (scopeTenantId: string | null) => {
      if (requesterIsSuperAdmin) {
        return;
      }

      if (!scopeTenantId) {
        throw new Error("Tenant context is required");
      }

      const requesterRole = await getTenantScopedRequesterRole(scopeTenantId);
      if (requesterRole !== "owner" && requesterRole !== "admin") {
        throw new Error("Forbidden: Insufficient permissions for this tenant");
      }
    };

    // --- ACTION: INVITE ---
    if (action === "invite") {
      if (!email) {
        throw new Error("Email is required");
      }

      const targetTenantId = resolveTenantScope(tenant_id ?? null);
      const inviteRole = normalizeRole(
        role,
        requesterIsSuperAdmin ? "admin" : "member",
      );

      if (!requesterIsSuperAdmin) {
        if (!targetTenantId) {
          throw new Error("Tenant ID is required");
        }

        await authorizeTenantAction(targetTenantId);
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth
        .admin.inviteUserByEmail(email, {
          redirectTo: redirectTo || undefined,
        });

      if (authError) throw authError;

      const targetUser = authData.user;
      if (!targetUser?.id) {
        throw new Error("Failed to create invited auth user");
      }

      await ensureProfile({
        targetUserId: targetUser.id,
        targetEmail: email,
        targetName: full_name || email.split("@")[0],
        targetRole: inviteRole,
        targetTenantId: targetTenantId,
        targetIsSuperAdmin: false,
      });

      if (targetTenantId) {
        await ensureMembership({
          targetUserId: targetUser.id,
          targetTenantId,
          targetRole: inviteRole,
          invitedBy: user.id,
        });
      }

      return new Response(
        JSON.stringify({
          message: "User invited successfully",
          user: targetUser,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- ACTION: RESEND INVITE ---
    if (action === "resend_invite") {
      if (!email) {
        throw new Error("Email is required");
      }

      const targetTenantId = resolveTenantScope(tenant_id ?? null);
      if (!requesterIsSuperAdmin) {
        if (!targetTenantId) {
          throw new Error("Tenant ID is required");
        }

        await authorizeTenantAction(targetTenantId);
      }

      const { data: existingUser, error: existingUserError } =
        await supabaseAdmin
          .from(PROFILE_TABLE)
          .select("id, tenant_id, current_tenant_id, role")
          .eq("email", email)
          .maybeSingle();

      if (existingUserError) throw existingUserError;
      if (!existingUser) {
        throw new Error("User not found");
      }

      if (targetTenantId) {
        const membership = await getMembership(existingUser.id, targetTenantId);
        if (
          !membership && existingUser.tenant_id !== targetTenantId &&
          existingUser.current_tenant_id !== targetTenantId
        ) {
          throw new Error("User not found in this tenant");
        }
      }

      const { error: inviteError } = await supabaseAdmin.auth.admin
        .inviteUserByEmail(email, {
          redirectTo: redirectTo || undefined,
        });

      if (inviteError) throw inviteError;

      return new Response(
        JSON.stringify({ message: "Invite resent successfully" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- ACTION: DELETE ---
    if (action === "delete") {
      if (!userId) {
        throw new Error("User ID is required for deletion");
      }

      const targetTenantId = resolveTenantScope(tenant_id ?? null);
      if (!requesterIsSuperAdmin) {
        if (!targetTenantId) {
          throw new Error("Tenant context is required");
        }

        await authorizeTenantAction(targetTenantId);

        if (userId === user.id) {
          throw new Error("Forbidden: You cannot delete your own account");
        }
      }

      const { data: targetMembership, error: targetMembershipError } =
        await supabaseAdmin
          .from(MEMBERSHIP_TABLE)
          .select("user_id, tenant_id, role, status")
          .eq("user_id", userId)
          .eq("tenant_id", targetTenantId || "")
          .maybeSingle();

      if (targetMembershipError) throw targetMembershipError;

      const { data: targetProfile, error: targetProfileError } =
        await supabaseAdmin
          .from(PROFILE_TABLE)
          .select("id, tenant_id, current_tenant_id, role, is_super_admin")
          .eq("id", userId)
          .maybeSingle();

      if (targetProfileError) throw targetProfileError;

      const belongsToTenant = Boolean(
        targetMembership ||
          (targetTenantId && targetProfile &&
            (targetProfile.tenant_id === targetTenantId ||
              targetProfile.current_tenant_id === targetTenantId)),
      );

      if (!belongsToTenant) {
        throw new Error("User not found");
      }

      if (targetTenantId) {
        const { error: deleteMembershipError } = await supabaseAdmin
          .from(MEMBERSHIP_TABLE)
          .delete()
          .eq("user_id", userId)
          .eq("tenant_id", targetTenantId);

        if (deleteMembershipError) throw deleteMembershipError;
      }

      const { data: remainingMemberships, error: remainingMembershipsError } =
        await supabaseAdmin
          .from(MEMBERSHIP_TABLE)
          .select("tenant_id, role, status, created_at")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: true });

      if (remainingMembershipsError) throw remainingMembershipsError;

      if (remainingMemberships && remainingMemberships.length > 0) {
        const nextTenantId = remainingMemberships[0].tenant_id;
        const updates: Record<string, unknown> = {};

        if (
          targetProfile &&
          (targetProfile.current_tenant_id === targetTenantId ||
            !targetProfile.current_tenant_id)
        ) {
          updates.current_tenant_id = nextTenantId;
        }

        if (
          targetProfile &&
          (targetProfile.tenant_id === targetTenantId ||
            !targetProfile.tenant_id)
        ) {
          updates.tenant_id = nextTenantId;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateProfileError } = await supabaseAdmin
            .from(PROFILE_TABLE)
            .update(updates)
            .eq("id", userId);

          if (updateProfileError) throw updateProfileError;
        }

        return new Response(
          JSON.stringify({ message: "User removed from tenant successfully" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      const { error: deleteProfileError } = await supabaseAdmin
        .from(PROFILE_TABLE)
        .delete()
        .eq("id", userId);

      if (deleteProfileError) throw deleteProfileError;

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin
        .deleteUser(userId);
      if (deleteAuthError) throw deleteAuthError;

      return new Response(
        JSON.stringify({ message: "User deleted successfully" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: `Manage Users Error: ${errorMessage}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
