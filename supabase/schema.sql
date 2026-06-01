-- ============================================================
-- CEYLORA TENANT MANAGER — Supabase Schema
-- Paste this entire file into Supabase SQL Editor and Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with role + display info
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('landlord', 'tenant')),
  full_name     TEXT NOT NULL,
  phone         TEXT,
  nic           TEXT,                    -- Sri Lanka National Identity Card
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPERTIES
-- A landlord can own multiple properties
-- ============================================================
CREATE TABLE public.properties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,           -- e.g. "Perera Residencies"
  address       TEXT NOT NULL,
  city          TEXT NOT NULL,
  district      TEXT,                    -- Sri Lanka district
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNITS
-- Each property has multiple rentable units
-- ============================================================
CREATE TABLE public.units (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number   TEXT NOT NULL,           -- e.g. "Unit 3A", "Room 2"
  floor         TEXT,
  monthly_rent  NUMERIC(12,2) NOT NULL,
  is_occupied   BOOLEAN DEFAULT FALSE,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TENANCIES
-- Links a tenant profile to a unit, with date range
-- ============================================================
CREATE TABLE public.tenancies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE,                  -- NULL = currently active
  monthly_rent    NUMERIC(12,2) NOT NULL,-- can differ from unit base rent
  deposit_amount  NUMERIC(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, tenant_id, start_date)
);

-- ============================================================
-- PAYMENTS
-- Rent payments submitted by tenant or marked by landlord
-- ============================================================
CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id      UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  period_year     INT NOT NULL,          -- e.g. 2025
  period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  amount          NUMERIC(12,2) NOT NULL,
  paid_date       DATE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'overdue')),
  submitted_by    TEXT NOT NULL CHECK (submitted_by IN ('tenant', 'landlord')),
  receipt_url     TEXT,                  -- Supabase Storage URL
  receipt_path    TEXT,                  -- Storage bucket path (for deletion)
  note            TEXT,
  confirmed_at    TIMESTAMPTZ,
  confirmed_by    UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenancy_id, period_year, period_month)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX idx_units_property ON public.units(property_id);
CREATE INDEX idx_tenancies_unit ON public.tenancies(unit_id);
CREATE INDEX idx_tenancies_tenant ON public.tenancies(tenant_id);
CREATE INDEX idx_tenancies_active ON public.tenancies(is_active);
CREATE INDEX idx_payments_tenancy ON public.payments(tenancy_id);
CREATE INDEX idx_payments_period ON public.payments(period_year, period_month);
CREATE INDEX idx_payments_status ON public.payments(status);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at   BEFORE UPDATE ON public.profiles   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_units_updated_at      BEFORE UPDATE ON public.units      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_tenancies_updated_at  BEFORE UPDATE ON public.tenancies  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_payments_updated_at   BEFORE UPDATE ON public.payments   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments   ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Landlords can view tenant profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies ten
      JOIN public.units u ON u.id = ten.unit_id
      JOIN public.properties p ON p.id = u.property_id
      WHERE ten.tenant_id = profiles.id
        AND p.landlord_id = auth.uid()
    )
  );

-- PROPERTIES — landlord only
CREATE POLICY "Landlords manage own properties"
  ON public.properties FOR ALL USING (landlord_id = auth.uid());

-- UNITS — landlord owns, tenant can view their unit
CREATE POLICY "Landlords manage own units"
  ON public.units FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.landlord_id = auth.uid())
  );
CREATE POLICY "Tenants view their unit"
  ON public.units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies ten
      WHERE ten.unit_id = units.id AND ten.tenant_id = auth.uid() AND ten.is_active = TRUE
    )
  );

-- TENANCIES
CREATE POLICY "Landlords manage tenancies in own properties"
  ON public.tenancies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = unit_id AND p.landlord_id = auth.uid()
    )
  );
CREATE POLICY "Tenants view own tenancies"
  ON public.tenancies FOR SELECT USING (tenant_id = auth.uid());

-- PAYMENTS
CREATE POLICY "Landlords manage payments in own properties"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies ten
      JOIN public.units u ON u.id = ten.unit_id
      JOIN public.properties p ON p.id = u.property_id
      WHERE ten.id = tenancy_id AND p.landlord_id = auth.uid()
    )
  );
CREATE POLICY "Tenants manage own payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies ten
      WHERE ten.id = tenancy_id AND ten.tenant_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKET for receipts
-- Run this in Supabase SQL Editor as well
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users access own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users delete own receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- NEW USER TRIGGER
-- Auto-creates a profile row when a user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER VIEW: Dashboard summary per landlord
-- ============================================================
CREATE OR REPLACE VIEW public.landlord_dashboard AS
SELECT
  p.landlord_id,
  COUNT(DISTINCT p.id)                                          AS total_properties,
  COUNT(DISTINCT u.id)                                          AS total_units,
  COUNT(DISTINCT CASE WHEN u.is_occupied THEN u.id END)         AS occupied_units,
  COUNT(DISTINCT CASE WHEN NOT u.is_occupied THEN u.id END)     AS vacant_units,
  COALESCE(SUM(DISTINCT CASE WHEN u.is_occupied THEN u.monthly_rent END), 0) AS total_monthly_rent
FROM public.properties p
LEFT JOIN public.units u ON u.property_id = p.id
GROUP BY p.landlord_id;
