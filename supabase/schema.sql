-- ============================================================
-- CEYLORA RENT MANAGEMENT SYSTEM — Full Schema v2.0
-- DROP everything and recreate clean
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP EXISTING (clean slate)
-- ============================================================
DROP TABLE IF EXISTS public.audit_logs         CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
DROP TABLE IF EXISTS public.leases             CASCADE;
DROP TABLE IF EXISTS public.payments           CASCADE;
DROP TABLE IF EXISTS public.tenancies          CASCADE;
DROP TABLE IF EXISTS public.units              CASCADE;
DROP TABLE IF EXISTS public.properties         CASCADE;
DROP TABLE IF EXISTS public.profiles           CASCADE;
DROP VIEW  IF EXISTS public.landlord_dashboard CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at CASCADE;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                     TEXT NOT NULL CHECK (role IN ('super_admin','landlord','tenant')),
  full_name                TEXT NOT NULL,
  username                 TEXT,
  landlord_id              UUID REFERENCES public.profiles(id),
  phone                    TEXT,
  email                    TEXT,
  nic                      TEXT,
  address                  TEXT,
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  is_active                BOOLEAN DEFAULT TRUE,
  must_change_password     BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE public.properties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_code TEXT,
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  city          TEXT NOT NULL,
  district      TEXT,
  country       TEXT DEFAULT 'Sri Lanka',
  property_type TEXT DEFAULT 'Residential',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNITS
-- ============================================================
CREATE TABLE public.units (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id          UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number          TEXT NOT NULL,
  floor                TEXT,
  monthly_rent         NUMERIC(12,2) NOT NULL,
  electricity_charges  NUMERIC(12,2) DEFAULT 0,
  water_charges        NUMERIC(12,2) DEFAULT 0,
  deposit_amount       NUMERIC(12,2) DEFAULT 0,
  is_occupied          BOOLEAN DEFAULT FALSE,
  description          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TENANCIES
-- ============================================================
CREATE TABLE public.tenancies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE,
  monthly_rent    NUMERIC(12,2) NOT NULL,
  deposit_amount  NUMERIC(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, tenant_id, start_date)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id      UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  period_year     INT NOT NULL,
  period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  amount          NUMERIC(12,2) NOT NULL,
  paid_date       DATE,
  payment_method  TEXT DEFAULT 'Bank Transfer',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','overdue')),
  submitted_by    TEXT NOT NULL CHECK (submitted_by IN ('tenant','landlord')),
  receipt_url     TEXT,
  receipt_path    TEXT,
  note            TEXT,
  confirmed_at    TIMESTAMPTZ,
  confirmed_by    UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenancy_id, period_year, period_month)
);

-- ============================================================
-- LEASES (schema ready — feature available soon)
-- ============================================================
CREATE TABLE public.leases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id      UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  lease_number    TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE,
  monthly_rent    NUMERIC(12,2) NOT NULL,
  deposit_amount  NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','expired','terminated')),
  document_path   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE REQUESTS (schema ready — feature available soon)
-- ============================================================
CREATE TABLE public.maintenance_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id  UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  image_path  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id),
  tenant_id   UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_properties_landlord    ON public.properties(landlord_id);
CREATE INDEX idx_units_property         ON public.units(property_id);
CREATE INDEX idx_tenancies_unit         ON public.tenancies(unit_id);
CREATE INDEX idx_tenancies_tenant       ON public.tenancies(tenant_id);
CREATE INDEX idx_tenancies_active       ON public.tenancies(is_active);
CREATE INDEX idx_payments_tenancy       ON public.payments(tenancy_id);
CREATE INDEX idx_payments_period        ON public.payments(period_year, period_month);
CREATE INDEX idx_payments_status        ON public.payments(status);
CREATE INDEX idx_audit_logs_user        ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created     ON public.audit_logs(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at          BEFORE UPDATE ON public.profiles          FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_properties_updated_at        BEFORE UPDATE ON public.properties        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_units_updated_at             BEFORE UPDATE ON public.units             FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_tenancies_updated_at         BEFORE UPDATE ON public.tenancies         FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_payments_updated_at          BEFORE UPDATE ON public.payments          FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_leases_updated_at            BEFORE UPDATE ON public.leases            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_maintenance_updated_at       BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- NEW USER TRIGGER
-- Auto-creates profile when a user is created via admin API
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, nic, address, emergency_contact_name, emergency_contact_phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'nic', NULL),
    COALESCE(NEW.raw_user_meta_data->>'address', NULL),
    COALESCE(NEW.raw_user_meta_data->>'emergency_contact_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'emergency_contact_phone', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admin full access to profiles"
  ON public.profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

CREATE POLICY "Landlords view their tenants"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies ten
      JOIN public.units u ON u.id = ten.unit_id
      JOIN public.properties prop ON prop.id = u.property_id
      WHERE ten.tenant_id = profiles.id AND prop.landlord_id = auth.uid()
    )
  );

-- ── PROPERTIES ──
CREATE POLICY "Landlords manage own properties"
  ON public.properties FOR ALL USING (landlord_id = auth.uid());

CREATE POLICY "Super admin view all properties"
  ON public.properties FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ── UNITS ──
CREATE POLICY "Landlords manage own units"
  ON public.units FOR ALL
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Tenants view their unit"
  ON public.units FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.unit_id = units.id AND t.tenant_id = auth.uid() AND t.is_active = TRUE));

CREATE POLICY "Super admin view all units"
  ON public.units FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ── TENANCIES ──
CREATE POLICY "Landlords manage their tenancies"
  ON public.tenancies FOR ALL
  USING (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON p.id = u.property_id WHERE u.id = unit_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Tenants view own tenancies"
  ON public.tenancies FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Super admin view all tenancies"
  ON public.tenancies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ── PAYMENTS ──
CREATE POLICY "Landlords manage payments in own properties"
  ON public.payments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenancies t JOIN public.units u ON u.id = t.unit_id JOIN public.properties p ON p.id = u.property_id WHERE t.id = tenancy_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Tenants manage own payments"
  ON public.payments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND t.tenant_id = auth.uid()));

CREATE POLICY "Super admin view all payments"
  ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- ── AUDIT LOGS ──
CREATE POLICY "Super admin view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ── LEASES & MAINTENANCE ──
CREATE POLICY "Landlords manage leases"
  ON public.leases FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenancies t JOIN public.units u ON u.id = t.unit_id JOIN public.properties p ON p.id = u.property_id WHERE t.id = tenancy_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Tenants view own leases"
  ON public.leases FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND t.tenant_id = auth.uid()));

CREATE POLICY "Landlords manage maintenance"
  ON public.maintenance_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenancies t JOIN public.units u ON u.id = t.unit_id JOIN public.properties p ON p.id = u.property_id WHERE t.id = tenancy_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Tenants manage own maintenance"
  ON public.maintenance_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND t.tenant_id = auth.uid()));

-- ============================================================
-- STORAGE BUCKET for receipts
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users delete own receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
