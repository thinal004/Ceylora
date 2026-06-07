-- ============================================================
--  CEYLORA — LANDLORD DATABASE SCHEMA
--  Run this ONCE on EACH landlord's own Supabase project.
--  This DB holds everything below the landlord: tenants,
--  properties, units, tenancies, payments and receipt images.
--
--  BEFORE running:
--   Supabase Dashboard → Authentication → Providers → Email
--     • Enable "Email" provider
--     • TURN OFF "Confirm email"  (so tenant signups are instant)
-- ============================================================

-- 1. PROFILES (tenants only) ---------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                    TEXT NOT NULL DEFAULT 'tenant',
  landlord_id             uuid,                 -- landlord's UUID from master (routing only)
  username                TEXT,
  email                   TEXT,
  full_name               TEXT NOT NULL,
  phone                   TEXT,
  nic                     TEXT,
  address                 TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  photo                   TEXT,                 -- Base64 image
  is_active               BOOLEAN NOT NULL DEFAULT true,
  must_change_password    BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_username
  ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;

-- 2. PROPERTIES ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id   uuid NOT NULL,
  property_code TEXT,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  district      TEXT,
  country       TEXT DEFAULT 'Sri Lanka',
  property_type TEXT DEFAULT 'Residential',
  image         TEXT,                           -- Base64 image
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. UNITS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number         TEXT NOT NULL,
  floor               TEXT,
  monthly_rent        NUMERIC NOT NULL DEFAULT 0,
  electricity_charges NUMERIC DEFAULT 0,
  water_charges       NUMERIC DEFAULT 0,
  deposit_amount      NUMERIC DEFAULT 0,
  description         TEXT,
  is_occupied         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TENANCIES ------------------------------------------------
--  tenant_id points to a profile in THIS database.
CREATE TABLE IF NOT EXISTS public.tenancies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE,
  monthly_rent   NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  rent_due_day   INT DEFAULT 1 CHECK (rent_due_day BETWEEN 1 AND 28),
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PAYMENTS -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id     uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  period_year    INT NOT NULL,
  period_month   INT NOT NULL,
  amount         NUMERIC NOT NULL DEFAULT 0,
  paid_date      DATE,
  payment_method TEXT,
  note           TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | overdue
  submitted_by   TEXT,                             -- tenant | landlord
  receipt_image  TEXT,                             -- Base64 image
  confirmed_at   TIMESTAMPTZ,
  confirmed_by   uuid,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. USERNAME LOGIN -------------------------------------------
--  Resolves a tenant username to their auth email so they can
--  sign in by username. SECURITY DEFINER → readable pre-auth.
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE LOWER(p.username) = LOWER(p_username)
    AND p.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- 7. ACCESS ---------------------------------------------------
--  RLS disabled (matches Ceylora's current posture). The landlord
--  reaches this DB with the anon key; tenants reach it authenticated.
ALTER TABLE public.profiles   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments   DISABLE ROW LEVEL SECURITY;
