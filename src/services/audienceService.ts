import { supabase } from './supabaseClient';
import { useAdminStore } from "@/store/adminStore";

export interface Tag {
    id: string;
    name: string;
    color: string;
    tenant_id: string;
}

export interface Audience {
    id: string;
    name: string;
    description?: string;
    total_contacts: number;
    created_at: string;
    tags?: Tag[];
}

export interface AudienceContact {
    phone_number: string;
    name?: string;
    metadata?: any;
    audience_id?: string;
}

export const audienceService = {
    /**
     * Fetch all audiences with their tags
     */
    /**
     * Fetch all audiences with their tags (Filtered by Tenant)
     */
    async getAudiences() {
        // 1. Get Tenant ID (Check store first for impersonation)
        let tenantId = useAdminStore.getState().impersonatedTenantId;

        if (!tenantId) {
            const { data, error } = await supabase.rpc('get_my_tenant_id');
            if (!error && data) tenantId = data;
        }

        if (!tenantId) {
            console.error("Error fetching tenant ID or no tenant found");
            return [];
        }

        // 2. Fetch Audiences
        const { data: audiences, error } = await supabase
            .from('audiences_dispara_lead_saas_02')
            .select(`
        *,
        audience_tags_dispara_lead_saas_02 (
          tag:tags_dispara_lead_saas_02 (*)
        )
      `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. Map tags to clean structure
        return audiences.map((a: any) => ({
            ...a,
            tags: a.audience_tags_dispara_lead_saas_02.map((t: any) => t.tag)
        }));
    },

    /**
     * Fetch all available tags (Filtered by Tenant)
     */
    async getTags() {
        let tenantId = useAdminStore.getState().impersonatedTenantId;

        if (!tenantId) {
            const { data, error } = await supabase.rpc('get_my_tenant_id');
            if (!error && data) tenantId = data;
        }

        if (!tenantId) return [];

        const { data, error } = await supabase
            .from('tags_dispara_lead_saas_02')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name');

        if (error) throw error;
        return data as Tag[];
    },

    /**
     * Create or Find tags by name
     */
    async ensureTags(tagNames: string[], tenantId: string): Promise<string[]> {
        if (tagNames.length === 0) return [];

        const tagIds: string[] = [];

        for (const name of tagNames) {
            // Try to find existing
            let { data, error } = await supabase
                .from('tags_dispara_lead_saas_02')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('name', name)
                .single();

            if (!data) {
                // Create if not exists
                const { data: newTag, error: createError } = await supabase
                    .from('tags_dispara_lead_saas_02')
                    .insert({ tenant_id: tenantId, name })
                    .select('id')
                    .single();

                if (createError) throw createError;
                if (newTag) tagIds.push(newTag.id);
            } else {
                tagIds.push(data.id);
            }
        }
        return tagIds;
    },

    /**
     * Create a new Audience
     */
    async createAudience(params: {
        name: string;
        description?: string;
        tags: string[]; // Tag Names
        contacts: AudienceContact[];
        tenantId: string;
    }) {
        // 1. Create Audience Record
        const { data: audience, error: audError } = await supabase
            .from('audiences_dispara_lead_saas_02')
            .insert({
                tenant_id: params.tenantId,
                name: params.name,
                description: params.description,
                total_contacts: params.contacts.length
            })
            .select('id')
            .single();

        if (audError) throw audError;

        const audienceId = audience.id;

        // 2. Handle Tags (Create or Find)
        const tagIds = await this.ensureTags(params.tags, params.tenantId);

        // 3. Link Tags
        if (tagIds.length > 0) {
            const tagLinks = tagIds.map(tagId => ({
                audience_id: audienceId,
                tag_id: tagId
            }));
            await supabase.from('audience_tags_dispara_lead_saas_02').insert(tagLinks);
        }

        // 4. Batch Insert Contacts (Chunked 1000)
        const chunkSize = 1000;
        for (let i = 0; i < params.contacts.length; i += chunkSize) {
            const chunk = params.contacts.slice(i, i + chunkSize).map(c => ({
                audience_id: audienceId,
                phone_number: c.phone_number,
                name: c.name,
                metadata: c.metadata || {}
            }));

            const { error: batchError } = await supabase
                .from('audience_contacts_dispara_lead_saas_02')
                .insert(chunk);

            if (batchError) console.error('Error inserting batch contact:', batchError);
        }

        return audience;
    },

    /**
  * Fetch contacts for specific audiences
  */
    async getContactsForAudiences(audienceIds: string[]): Promise<AudienceContact[]> {
        const { data, error } = await supabase
            .from('audience_contacts_dispara_lead_saas_02')
            .select('phone_number, name, metadata, audience_id')
            .in('audience_id', audienceIds);

        if (error) throw error;
        return data || [];
    }
};
