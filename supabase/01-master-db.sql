-- ============================================================
--  CEYLORA — MASTER DATABASE
--  Run this ONCE on your main Ceylora Supabase project.
--  Master holds ONLY: super_admin + landlord accounts, and the
--  routing table that points each landlord to their own DB.
-- ============================================================

-- 1. Landlord Code on the connections table -----------------
ALTER TABLE public.tenant_connections
  ADD COLUMN IF NOT EXISTS landlord_code TEXT;

-- One code per landlord, case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_connections_code
  ON public.tenant_connections (UPPER(landlord_code))
  WHERE landlord_code IS NOT NULL;

-- 2. Pre-auth lookup: tenant enters a Landlord Code on login,
--    we resolve the landlord DB url + anon key.
--    SECURITY DEFINER so it works before the tenant is signed in.
--    (Returns only the public anon key — never a service role key.)
CREATE OR REPLACE FUNCTION public.get_connection_by_code(p_code TEXT)
RETURNS TABLE (db_url TEXT, db_anon_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT db_url, db_anon_key
  FROM public.tenant_connections
  WHERE UPPER(landlord_code) = UPPER(p_code)
    AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_connection_by_code(TEXT) TO anon, authenticated;
