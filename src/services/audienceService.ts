import { supabase } from './supabaseClient';
import { useAdminStore } from "@/store/adminStore";
import { formatBrazilPhone } from "@/lib/phoneUtils";

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

type AudienceTagRelation = {
    tag?: Tag | null;
};

type AudienceRow = Audience & {
    audience_tags_dispara_lead_saas_02?: AudienceTagRelation[];
};

export interface AudienceContact {
    id?: string;
    created_at?: string;
    phone_number: string;
    name?: string | null;
    metadata?: Record<string, unknown>;
    audience_id?: string;
}

export interface AudienceContactInput {
    phone_number: string;
    name?: string | null;
    metadata?: Record<string, unknown>;
}

export interface AudienceContactsPageParams {
    audienceId: string;
    page?: number;
    pageSize?: number;
    searchTerm?: string;
}

export interface AudienceContactsPageResult {
    data: AudienceContact[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface AudienceMutationResult {
    insertedCount: number;
    skippedCount: number;
}

export interface AudienceTagMutationResult {
    added: Tag[];
    skippedCount: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const resolveTenantId = async () => {
    let tenantId = useAdminStore.getState().impersonatedTenantId;

    if (!tenantId) {
        const { data, error } = await supabase.rpc('get_my_tenant_id');
        if (!error && data) tenantId = data;
    }

    return tenantId;
};

const clampPage = (value?: number) => {
    const page = Number.isFinite(value) ? Number(value) : 1;
    return Math.max(1, Math.trunc(page));
};

const clampPageSize = (value?: number) => {
    const pageSize = Number.isFinite(value) ? Number(value) : DEFAULT_PAGE_SIZE;
    return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize)));
};

const normalizeSearchTerm = (value?: string) => (typeof value === 'string' ? value.trim() : '');

const normalizeAudiencePhone = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return null;

    const formatted = formatBrazilPhone(value);
    if (formatted) return formatted;

    const cleaned = String(value).replace(/\D/g, '');
    return cleaned.length >= 8 ? cleaned : null;
};

const escapeLikeTerm = (value: string) => value.replace(/[\\%_]/g, '\\$&').replace(/,/g, ' ');

type RpcErrorLike = {
    code?: string;
    message?: string;
};

type RpcContactPageRow = {
    id?: string;
    audience_id?: string;
    phone_number?: string;
    name?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: string;
    total_count?: number | string | null;
    count?: number | string | null;
};

type RpcContactPagePayload =
    | RpcContactPageRow[]
    | {
        data?: RpcContactPageRow[];
        rows?: RpcContactPageRow[];
        results?: RpcContactPageRow[];
        count?: number | string | null;
        total_count?: number | string | null;
        totalCount?: number | string | null;
    }
    | null;

type RpcMutationRow = {
    inserted_count?: number | string | null;
    insertedCount?: number | string | null;
    inserted?: number | string | null;
    skipped_count?: number | string | null;
    skippedCount?: number | string | null;
    skipped?: number | string | null;
    data?: RpcMutationRow[];
};

const isMissingRpcError = (error: unknown) => {
    const typedError = error as RpcErrorLike | null | undefined;
    const code = typedError?.code;
    const message = String(typedError?.message || '').toLowerCase();
    return code === '42883' || code === 'PGRST202' || message.includes('does not exist');
};

const mapAudienceContact = (contact: RpcContactPageRow): AudienceContact => ({
    id: contact?.id,
    audience_id: contact?.audience_id,
    phone_number: contact?.phone_number,
    name: contact?.name ?? null,
    metadata: contact?.metadata ?? {},
    created_at: contact?.created_at,
});

const normalizeRpcContactPage = (data: RpcContactPagePayload, page: number, pageSize: number): AudienceContactsPageResult => {
    let rows: RpcContactPageRow[] = [];
    let count = 0;

    if (Array.isArray(data)) {
        rows = data;
    } else if (data && Array.isArray(data.data)) {
        rows = data.data;
        count = Number(data.count ?? data.total_count ?? data.totalCount ?? 0);
    } else if (data && Array.isArray(data.rows)) {
        rows = data.rows;
        count = Number(data.count ?? data.total_count ?? data.totalCount ?? 0);
    } else if (data && Array.isArray(data.results)) {
        rows = data.results;
        count = Number(data.count ?? data.total_count ?? data.totalCount ?? 0);
    }

    if (count === 0 && rows.length > 0) {
        count = Number(rows[0]?.total_count ?? rows[0]?.count ?? rows.length);
    }

    return {
        data: rows.map((row) => mapAudienceContact(row)),
        count,
        page,
        pageSize,
        totalPages: count > 0 ? Math.ceil(count / pageSize) : 0,
    };
};

const refreshAudienceTotalContacts = async (audienceId: string) => {
    const { count, error } = await supabase
        .from('audience_contacts_dispara_lead_saas_02')
        .select('id', { count: 'exact', head: true })
        .eq('audience_id', audienceId);

    if (error) throw error;

    const { error: updateError } = await supabase
        .from('audiences_dispara_lead_saas_02')
        .update({
            total_contacts: count || 0,
            updated_at: new Date().toISOString(),
        })
        .eq('id', audienceId);

    if (updateError) throw updateError;
};

const fetchAudienceContactsPageFallback = async (params: AudienceContactsPageParams): Promise<AudienceContactsPageResult> => {
    const page = clampPage(params.page);
    const pageSize = clampPageSize(params.pageSize);
    const searchTerm = normalizeSearchTerm(params.searchTerm);
    const searchDigits = searchTerm.replace(/\D/g, '');

    let query = supabase
        .from('audience_contacts_dispara_lead_saas_02')
        .select('id, audience_id, phone_number, name, metadata, created_at', { count: 'exact' })
        .eq('audience_id', params.audienceId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

    if (searchTerm) {
        const filters: string[] = [];
        const escapedSearch = escapeLikeTerm(searchTerm);
        if (escapedSearch) filters.push(`name.ilike.%${escapedSearch}%`);
        if (searchDigits) filters.push(`phone_number.ilike.%${searchDigits}%`);

        if (filters.length > 0) {
            query = query.or(filters.join(','));
        }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const mappedData = (data || []).map((contact: RpcContactPageRow) => mapAudienceContact(contact));
    const totalCount = typeof count === 'number' ? count : mappedData.length;

    return {
        data: mappedData,
        count: totalCount,
        page,
        pageSize,
        totalPages: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
    };
};

const extractMutationCounts = (data: RpcMutationRow | RpcMutationRow[] | null): AudienceMutationResult => {
    const row = Array.isArray(data) ? data[0] : data;
    const payload = row?.data && Array.isArray(row.data) ? row.data[0] : row;
    const insertedCount = Number(payload?.inserted_count ?? payload?.insertedCount ?? payload?.inserted ?? 0);
    const skippedCount = Number(payload?.skipped_count ?? payload?.skippedCount ?? payload?.skipped ?? 0);

    return {
        insertedCount: Number.isFinite(insertedCount) ? insertedCount : 0,
        skippedCount: Number.isFinite(skippedCount) ? skippedCount : 0,
    };
};

const normalizeAudienceContactsInput = (contacts: AudienceContactInput[]) => {
    const uniqueByPhone = new Map<string, AudienceContactInput>();

    for (const contact of contacts || []) {
        const phone = normalizeAudiencePhone(contact?.phone_number);
        if (!phone) continue;

        if (!uniqueByPhone.has(phone)) {
            uniqueByPhone.set(phone, {
                phone_number: phone,
                name: typeof contact?.name === 'string' ? contact.name.trim() : contact?.name ?? null,
                metadata: contact?.metadata ?? {},
            });
        }
    }

    return Array.from(uniqueByPhone.values());
};

const extractMetadataKeysFromContacts = (contacts: AudienceContact[]) => {
    const keys = new Set<string>();

    for (const contact of contacts) {
        for (const key of Object.keys(contact.metadata ?? {})) {
            const normalizedKey = key.trim();
            if (normalizedKey) keys.add(normalizedKey);
        }
    }

    return Array.from(keys).sort((a, b) => a.localeCompare(b));
};

export const audienceService = {
    /**
     * Fetch all audiences with their tags
     */
    /**
     * Fetch all audiences with their tags (Filtered by Tenant)
     */
    async getAudiences() {
        const tenantId = await resolveTenantId();

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
        return ((audiences || []) as AudienceRow[]).map((a) => ({
            ...a,
            tags: Array.isArray(a?.audience_tags_dispara_lead_saas_02)
                ? a.audience_tags_dispara_lead_saas_02
                    .map((t) => t?.tag)
                    .filter(Boolean)
                : []
        }));
    },

    /**
     * Fetch all available tags (Filtered by Tenant)
     */
    async getTags() {
        const tenantId = await resolveTenantId();

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
        if (!Array.isArray(tagNames) || tagNames.length === 0) return [];

        const tagIds: string[] = [];

        for (const rawName of tagNames) {
            const name = typeof rawName === 'string' ? rawName.trim() : '';
            if (!name) continue;
            // Try to find existing
            const { data, error } = await supabase
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
        if (!Array.isArray(audienceIds) || audienceIds.length === 0) return [];

        const { data, error } = await supabase
            .from('audience_contacts_dispara_lead_saas_02')
            .select('id, phone_number, name, metadata, audience_id, created_at')
            .in('audience_id', audienceIds)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapAudienceContact);
    },

    async getAudienceContactsPage(params: AudienceContactsPageParams): Promise<AudienceContactsPageResult> {
        const page = clampPage(params.page);
        const pageSize = clampPageSize(params.pageSize);
        const searchTerm = normalizeSearchTerm(params.searchTerm);

        try {
            const { data, error } = await supabase.rpc('get_audience_contacts_page', {
                p_audience_id: params.audienceId,
                p_search: searchTerm || null,
                p_page: page,
                p_page_size: pageSize,
            });

            if (!error) {
                return normalizeRpcContactPage(data, page, pageSize);
            }

            if (!isMissingRpcError(error)) throw error;
        } catch (error) {
            if (!isMissingRpcError(error)) throw error;
        }

        return fetchAudienceContactsPageFallback({
            audienceId: params.audienceId,
            page,
            pageSize,
            searchTerm,
        });
    },

    async getAudienceMetadataKeys(audienceId: string): Promise<string[]> {
        if (!audienceId) return [];

        try {
            const { data, error } = await supabase.rpc('get_audience_metadata_keys', {
                p_audience_id: audienceId,
            });

            if (!error && Array.isArray(data)) {
                return data
                    .map((row: { key?: string | null }) => row.key?.trim() || '')
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
            }

            if (!isMissingRpcError(error)) throw error;
        } catch (error) {
            if (!isMissingRpcError(error)) throw error;
        }

        const contacts = await this.getContactsForAudiences([audienceId]);
        return extractMetadataKeysFromContacts(contacts);
    },

    async addContactsToAudience(params: {
        audienceId: string;
        contacts: AudienceContactInput[];
    }): Promise<AudienceMutationResult> {
        const normalizedContacts = normalizeAudienceContactsInput(params.contacts);
        if (normalizedContacts.length === 0) {
            return { insertedCount: 0, skippedCount: 0 };
        }

        try {
            const { data, error } = await supabase.rpc('add_contacts_to_audience', {
                p_audience_id: params.audienceId,
                p_contacts: normalizedContacts,
            });

            if (!error) {
                return extractMutationCounts(data);
            }

            if (!isMissingRpcError(error)) throw error;
        } catch (error) {
            if (!isMissingRpcError(error)) throw error;
        }

        const { data: existingContacts, error: existingError } = await supabase
            .from('audience_contacts_dispara_lead_saas_02')
            .select('phone_number')
            .eq('audience_id', params.audienceId);

        if (existingError) throw existingError;

        const existingPhones = new Set((existingContacts || []).map((contact: { phone_number: string }) => contact.phone_number));
        const freshContacts = normalizedContacts.filter((contact) => !existingPhones.has(contact.phone_number));
        const skippedCount = normalizedContacts.length - freshContacts.length;

        if (freshContacts.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < freshContacts.length; i += chunkSize) {
                const chunk = freshContacts.slice(i, i + chunkSize).map((contact) => ({
                    audience_id: params.audienceId,
                    phone_number: contact.phone_number,
                    name: contact.name ?? null,
                    metadata: contact.metadata ?? {},
                }));

                const { error } = await supabase
                    .from('audience_contacts_dispara_lead_saas_02')
                    .insert(chunk);

                if (error) throw error;
            }
        }

        await refreshAudienceTotalContacts(params.audienceId);

        return {
            insertedCount: freshContacts.length,
            skippedCount,
        };
    },

    async removeAudienceContact(contactId: string): Promise<boolean> {
        if (!contactId) return false;

        try {
            const { data, error } = await supabase.rpc('remove_audience_contact', {
                p_contact_id: contactId,
            });

            if (!error) {
                return Boolean(data ?? true);
            }

            if (!isMissingRpcError(error)) throw error;
        } catch (error) {
            if (!isMissingRpcError(error)) throw error;
        }

        const { data: contact, error: contactError } = await supabase
            .from('audience_contacts_dispara_lead_saas_02')
            .select('audience_id')
            .eq('id', contactId)
            .maybeSingle();

        if (contactError) throw contactError;
        if (!contact?.audience_id) return false;

        const { error: deleteError } = await supabase
            .from('audience_contacts_dispara_lead_saas_02')
            .delete()
            .eq('id', contactId);

        if (deleteError) throw deleteError;

        await refreshAudienceTotalContacts(contact.audience_id);
        return true;
    },

    async addAudienceTags(params: {
        audienceId: string;
        tagNames: string[];
    }): Promise<AudienceTagMutationResult> {
        const audienceId = params.audienceId?.trim();
        const normalizedNames = Array.from(
            new Set(
                (params.tagNames || [])
                    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
                    .filter(Boolean)
            )
        );

        if (!audienceId || normalizedNames.length === 0) {
            return { added: [], skippedCount: 0 };
        }

        const tenantId = await resolveTenantId();
        if (!tenantId) {
            throw new Error('Tenant não encontrado para adicionar tags à audiência.');
        }

        const existingAudience = await this.getAudiences();
        const currentAudience = existingAudience.find((audience) => audience.id === audienceId);
        const currentTagIds = new Set((currentAudience?.tags || []).map((tag) => tag.id));

        const tagIds = await this.ensureTags(normalizedNames, tenantId);
        if (tagIds.length === 0) {
            return { added: [], skippedCount: normalizedNames.length };
        }

        const relationsToInsert = tagIds
            .filter((tagId) => !currentTagIds.has(tagId))
            .map((tagId) => ({
                audience_id: audienceId,
                tag_id: tagId,
            }));

        if (relationsToInsert.length > 0) {
            const { error } = await supabase
                .from('audience_tags_dispara_lead_saas_02')
                .upsert(relationsToInsert, {
                    onConflict: 'audience_id,tag_id',
                    ignoreDuplicates: true,
                });

            if (error) throw error;
        }

        const allTags = await this.getTags();
        const added = allTags.filter((tag) => tagIds.includes(tag.id) && !currentTagIds.has(tag.id));

        return {
            added,
            skippedCount: normalizedNames.length - added.length,
        };
    },

    async removeAudienceTag(params: {
        audienceId: string;
        tagId: string;
    }): Promise<boolean> {
        if (!params.audienceId || !params.tagId) return false;

        const { error } = await supabase
            .from('audience_tags_dispara_lead_saas_02')
            .delete()
            .eq('audience_id', params.audienceId)
            .eq('tag_id', params.tagId);

        if (error) throw error;
        return true;
    }
};
