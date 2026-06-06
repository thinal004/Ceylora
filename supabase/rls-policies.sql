-- ============================================================
-- CEYLORA — Secure RLS Policies v2.0
-- Uses SECURITY DEFINER functions to prevent recursive lookups
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Step 1: Drop all existing policies ──────────────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── Step 2: Create SECURITY DEFINER helper functions ─────────
-- These bypass RLS when called, preventing recursive policy evaluation

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_active()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_active, false) FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_user_landlord_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT landlord_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT email FROM auth.users WHERE id = p_user_id
$$;

-- ── Step 3: Re-enable RLS on all tables ──────────────────────
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;

-- ── Step 4: PROFILES policies ────────────────────────────────

-- Every authenticated user can read their own profile (non-recursive)
CREATE POLICY "profiles_read_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Every authenticated user can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admin can read all profiles (uses helper function, no recursion)
CREATE POLICY "profiles_super_admin_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.auth_user_role() = 'super_admin');

-- Super admin can update all profiles
CREATE POLICY "profiles_super_admin_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.auth_user_role() = 'super_admin');

-- Super admin can insert profiles
CREATE POLICY "profiles_super_admin_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_user_role() = 'super_admin');

-- Landlord can read profiles of their own tenants
CREATE POLICY "profiles_landlord_read_tenants"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    landlord_id = auth.uid()
    AND public.auth_user_role() = 'landlord'
  );

-- Landlord can update their tenants' profiles (e.g. suspend)
CREATE POLICY "profiles_landlord_update_tenants"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    landlord_id = auth.uid()
    AND public.auth_user_role() = 'landlord'
  );

-- Allow trigger to insert profile on new user signup
CREATE POLICY "profiles_insert_on_signup"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── Step 5: PROPERTIES policies ──────────────────────────────

-- Landlord manages their own properties
CREATE POLICY "properties_landlord_all"
  ON public.properties FOR ALL
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Super admin can view all properties (read-only)
CREATE POLICY "properties_super_admin_read"
  ON public.properties FOR SELECT
  TO authenticated
  USING (public.auth_user_role() = 'super_admin');

-- Tenant can view their own property (via active tenancy)
CREATE POLICY "properties_tenant_read"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      JOIN public.units u ON u.id = t.unit_id
      WHERE u.property_id = properties.id
        AND t.tenant_id = auth.uid()
        AND t.is_active = true
    )
  );

-- ── Step 6: UNITS policies ───────────────────────────────────

-- Landlord manages units in their own properties
CREATE POLICY "units_landlord_all"
  ON public.units FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.landlord_id = auth.uid()
    )
  );

-- Super admin can view all units
CREATE POLICY "units_super_admin_read"
  ON public.units FOR SELECT
  TO authenticated
  USING (public.auth_user_role() = 'super_admin');

-- Tenant can view their assigned unit
CREATE POLICY "units_tenant_read"
  ON public.units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      WHERE t.unit_id = units.id
        AND t.tenant_id = auth.uid()
        AND t.is_active = true
    )
  );

-- ── Step 7: TENANCIES policies ───────────────────────────────

-- Landlord manages tenancies in their properties
CREATE POLICY "tenancies_landlord_all"
  ON public.tenancies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = unit_id AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = unit_id AND p.landlord_id = auth.uid()
    )
  );

-- Tenant can view their own tenancies
CREATE POLICY "tenancies_tenant_read"
  ON public.tenancies FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Super admin can view all tenancies
CREATE POLICY "tenancies_super_admin_read"
  ON public.tenancies FOR SELECT
  TO authenticated
  USING (public.auth_user_role() = 'super_admin');

-- ── Step 8: PAYMENTS policies ────────────────────────────────

-- Landlord manages payments in their properties
CREATE POLICY "payments_landlord_all"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      JOIN public.units u ON u.id = t.unit_id
      JOIN public.properties p ON p.id = u.property_id
      WHERE t.id = tenancy_id AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      JOIN public.units u ON u.id = t.unit_id
      JOIN public.properties p ON p.id = u.property_id
      WHERE t.id = tenancy_id AND p.landlord_id = auth.uid()
    )
  );

-- Tenant manages their own payments
CREATE POLICY "payments_tenant_all"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      WHERE t.id = tenancy_id AND t.tenant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      WHERE t.id = tenancy_id AND t.tenant_id = auth.uid()
    )
  );

-- Super admin can view all payments
CREATE POLICY "payments_super_admin_read"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.auth_user_role() = 'super_admin');

-- ── Step 9: AUDIT LOGS policies ──────────────────────────────

-- Super admin can view all audit logs
CREATE POLICY "audit_logs_super_admin_read"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.auth_user_role() = 'super_admin');

-- Any authenticated user can insert audit logs (system logging)
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── Step 10: LEASES & MAINTENANCE policies ───────────────────

CREATE POLICY "leases_landlord_all"
  ON public.leases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenancies t JOIN public.units u ON u.id = t.unit_id JOIN public.properties p ON p.id = u.property_id WHERE t.id = tenancy_id AND p.landlord_id = auth.uid()));

CREATE POLICY "leases_tenant_read"
  ON public.leases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND t.tenant_id = auth.uid()));

CREATE POLICY "maintenance_landlord_all"
  ON public.maintenance_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenancies t JOIN public.units u ON u.id = t.unit_id JOIN public.properties p ON p.id = u.property_id WHERE t.id = tenancy_id AND p.landlord_id = auth.uid()));

CREATE POLICY "maintenance_tenant_all"
  ON public.maintenance_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND t.tenant_id = auth.uid()));

-- ── Step 11: Fix handle_new_user trigger ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, username, phone, email, nic,
    address, emergency_contact_name, emergency_contact_phone,
    landlord_id, is_active, must_change_password
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'email',
    NEW.raw_user_meta_data->>'nic',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'emergency_contact_name',
    NEW.raw_user_meta_data->>'emergency_contact_phone',
    CASE WHEN NEW.raw_user_meta_data->>'landlord_id' IS NOT NULL
         THEN (NEW.raw_user_meta_data->>'landlord_id')::UUID
         ELSE NULL END,
    true,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, true)
  )
  ON CONFLICT (id) DO UPDATE SET
    username             = EXCLUDED.username,
    landlord_id          = EXCLUDED.landlord_id,
    must_change_password = EXCLUDED.must_change_password;
  RETURN NEW;
END;
$$;
