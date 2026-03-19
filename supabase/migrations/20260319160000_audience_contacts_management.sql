-- Audience contacts management foundation
-- Date: 2026-03-19
-- Purpose: support paginated listing, search, safe add/remove operations, and consistent audience totals.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- 1. Helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_audience_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public
AS $function$
DECLARE
  cleaned text;
BEGIN
  cleaned := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  IF cleaned = '' THEN
    RETURN cleaned;
  END IF;

  IF length(cleaned) = 10 THEN
    RETURN '55' || substring(cleaned from 1 for 2) || '9' || substring(cleaned from 3);
  ELSIF length(cleaned) = 11 THEN
    RETURN '55' || cleaned;
  ELSIF length(cleaned) = 12 AND left(cleaned, 2) = '55' THEN
    RETURN '55' || substring(cleaned from 3 for 2) || '9' || substring(cleaned from 5);
  ELSIF length(cleaned) = 13 AND left(cleaned, 2) = '55' THEN
    RETURN cleaned;
  ELSIF length(cleaned) > 8 THEN
    RETURN cleaned;
  END IF;

  RETURN cleaned;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_audience_total_contacts(p_audience_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF p_audience_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.audiences_dispara_lead_saas_02
     SET total_contacts = (
           SELECT count(*)::integer
           FROM public.audience_contacts_dispara_lead_saas_02
           WHERE audience_id = p_audience_id
         ),
         updated_at = now()
   WHERE id = p_audience_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_audience_contact_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.phone_number := public.normalize_audience_phone(coalesce(NEW.phone_number, ''));
  NEW.name := nullif(btrim(coalesce(NEW.name, '')), '');
  NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_audience_total_contacts_from_new_rows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT audience_id
    FROM new_rows
    WHERE audience_id IS NOT NULL
  LOOP
    PERFORM public.refresh_audience_total_contacts(r.audience_id);
  END LOOP;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_audience_total_contacts_from_old_rows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT audience_id
    FROM old_rows
    WHERE audience_id IS NOT NULL
  LOOP
    PERFORM public.refresh_audience_total_contacts(r.audience_id);
  END LOOP;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_audience_total_contacts_from_changed_rows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT audience_id
    FROM (
      SELECT audience_id FROM new_rows
      UNION
      SELECT audience_id FROM old_rows
    ) affected
    WHERE audience_id IS NOT NULL
  LOOP
    PERFORM public.refresh_audience_total_contacts(r.audience_id);
  END LOOP;

  RETURN NULL;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Normalize existing data before constraints
-- -----------------------------------------------------------------------------

UPDATE public.audience_contacts_dispara_lead_saas_02
   SET phone_number = public.normalize_audience_phone(phone_number),
       name = nullif(btrim(coalesce(name, '')), ''),
       metadata = coalesce(metadata, '{}'::jsonb)
 WHERE phone_number IS DISTINCT FROM public.normalize_audience_phone(phone_number)
    OR name IS DISTINCT FROM nullif(btrim(coalesce(name, '')), '')
    OR metadata IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audience_contacts_phone_number_normalized_check'
  ) THEN
    ALTER TABLE public.audience_contacts_dispara_lead_saas_02
      ADD CONSTRAINT audience_contacts_phone_number_normalized_check
      CHECK (phone_number = public.normalize_audience_phone(phone_number));
  END IF;
END
$$;

-- Remove duplicates while keeping the earliest contact per audience/phone pair.
WITH ranked_contacts AS (
  SELECT
    id,
    audience_id,
    phone_number,
    row_number() OVER (
      PARTITION BY audience_id, phone_number
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.audience_contacts_dispara_lead_saas_02
)
DELETE FROM public.audience_contacts_dispara_lead_saas_02 ac
USING ranked_contacts rc
WHERE ac.id = rc.id
  AND rc.rn > 1;

-- -----------------------------------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audience_contacts_audience_created_at
  ON public.audience_contacts_dispara_lead_saas_02 (audience_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audience_contacts_name_trgm
  ON public.audience_contacts_dispara_lead_saas_02
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_audience_contacts_phone_number_trgm
  ON public.audience_contacts_dispara_lead_saas_02
  USING gin (phone_number gin_trgm_ops);

-- Ensure the same normalized phone cannot be inserted twice for the same audience.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_audience_contacts_audience_phone_number'
  ) THEN
    CREATE UNIQUE INDEX uq_audience_contacts_audience_phone_number
      ON public.audience_contacts_dispara_lead_saas_02 (audience_id, phone_number);
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_normalize_audience_contact_row
ON public.audience_contacts_dispara_lead_saas_02;

CREATE TRIGGER trg_normalize_audience_contact_row
BEFORE INSERT OR UPDATE ON public.audience_contacts_dispara_lead_saas_02
FOR EACH ROW
EXECUTE FUNCTION public.normalize_audience_contact_row();

DROP TRIGGER IF EXISTS trg_sync_audience_total_contacts_insert
ON public.audience_contacts_dispara_lead_saas_02;

CREATE TRIGGER trg_sync_audience_total_contacts_insert
AFTER INSERT ON public.audience_contacts_dispara_lead_saas_02
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_audience_total_contacts_from_new_rows();

DROP TRIGGER IF EXISTS trg_sync_audience_total_contacts_delete
ON public.audience_contacts_dispara_lead_saas_02;

CREATE TRIGGER trg_sync_audience_total_contacts_delete
AFTER DELETE ON public.audience_contacts_dispara_lead_saas_02
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_audience_total_contacts_from_old_rows();

DROP TRIGGER IF EXISTS trg_sync_audience_total_contacts_update
ON public.audience_contacts_dispara_lead_saas_02;

CREATE TRIGGER trg_sync_audience_total_contacts_update
AFTER UPDATE ON public.audience_contacts_dispara_lead_saas_02
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_audience_total_contacts_from_changed_rows();

-- Recompute totals once after data cleanup so existing audiences are accurate.
UPDATE public.audiences_dispara_lead_saas_02 a
   SET total_contacts = coalesce(c.total_contacts, 0),
       updated_at = now()
  FROM (
    SELECT
      aud.id AS audience_id,
      count(ac.id)::integer AS total_contacts
    FROM public.audiences_dispara_lead_saas_02 aud
    LEFT JOIN public.audience_contacts_dispara_lead_saas_02 ac
      ON ac.audience_id = aud.id
    GROUP BY aud.id
  ) c
 WHERE a.id = c.audience_id
   AND a.total_contacts IS DISTINCT FROM coalesce(c.total_contacts, 0);

-- -----------------------------------------------------------------------------
-- 5. RPCs
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_audience_contacts_page(
  p_audience_id uuid,
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  audience_id uuid,
  phone_number text,
  name text,
  metadata jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := greatest(least(coalesce(p_page_size, 25), 100), 1);
  v_offset integer := (v_page - 1) * v_page_size;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_search_digits text := nullif(public.normalize_audience_phone(v_search), '');
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      ac.id,
      ac.audience_id,
      ac.phone_number,
      ac.name,
      ac.metadata,
      ac.created_at
    FROM public.audience_contacts_dispara_lead_saas_02 ac
    WHERE ac.audience_id = p_audience_id
      AND (
        v_search IS NULL
        OR ac.name ILIKE '%' || v_search || '%'
        OR (
          v_search_digits IS NOT NULL
          AND ac.phone_number ILIKE '%' || v_search_digits || '%'
        )
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS total_count
    FROM filtered
  )
  SELECT
    f.id,
    f.audience_id,
    f.phone_number,
    f.name,
    f.metadata,
    f.created_at,
    c.total_count
  FROM filtered f
  CROSS JOIN counted c
  ORDER BY f.created_at DESC, f.id DESC
  OFFSET v_offset
  LIMIT v_page_size;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_contacts_to_audience(
  p_audience_id uuid,
  p_contacts jsonb
)
RETURNS TABLE (
  inserted_count integer,
  skipped_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_inserted integer := 0;
  v_skipped integer := 0;
BEGIN
  WITH payload AS (
    SELECT
      p_audience_id AS audience_id,
      public.normalize_audience_phone(coalesce(item->>'phone_number', item->>'phone')) AS phone_number,
      nullif(btrim(coalesce(item->>'name', '')), '') AS name,
      CASE
        WHEN jsonb_typeof(item->'metadata') = 'object' THEN coalesce(item->'metadata', '{}'::jsonb)
        ELSE '{}'::jsonb
      END AS metadata
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(coalesce(p_contacts, '[]'::jsonb)) = 'array' THEN coalesce(p_contacts, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) AS item
  ),
  cleaned AS (
    SELECT *
    FROM payload
    WHERE phone_number IS NOT NULL
      AND phone_number <> ''
  ),
  deduped AS (
    SELECT DISTINCT ON (audience_id, phone_number)
      audience_id,
      phone_number,
      name,
      metadata
    FROM cleaned
    ORDER BY audience_id, phone_number, (name IS NULL), length(coalesce(name, '')) DESC, name ASC
  ),
  inserted AS (
    INSERT INTO public.audience_contacts_dispara_lead_saas_02 (
      audience_id,
      phone_number,
      name,
      metadata
    )
    SELECT
      audience_id,
      phone_number,
      name,
      metadata
    FROM deduped
    ON CONFLICT (audience_id, phone_number) DO NOTHING
    RETURNING 1
  )
  SELECT
    coalesce((SELECT count(*) FROM inserted), 0)::integer,
    greatest(coalesce((SELECT count(*) FROM deduped), 0)::integer - coalesce((SELECT count(*) FROM inserted), 0)::integer, 0)
  INTO v_inserted, v_skipped;

  RETURN QUERY
  SELECT v_inserted, v_skipped;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_audience_contact(
  p_contact_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_deleted_count integer := 0;
BEGIN
  DELETE FROM public.audience_contacts_dispara_lead_saas_02
   WHERE id = p_contact_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count > 0;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_audience_contacts_page(uuid, text, integer, integer)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.add_contacts_to_audience(uuid, jsonb)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.remove_audience_contact(uuid)
  TO authenticated, service_role;
