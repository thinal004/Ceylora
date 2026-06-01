# Ceylora Tenant Manager 🇱🇰

A cloud-based property and tenant management system for Sri Lankan landlords.
Built with React + Supabase + Vercel.

---

## Stack
- **Frontend**: React + Vite → hosted on Vercel (free)
- **Database**: Supabase PostgreSQL (free tier, never pauses if users log in)
- **Auth**: Supabase Auth (email + password)
- **File Storage**: Supabase Storage (receipt images visible to both landlord and tenant)

---

## Deploy in 4 Steps

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. Click **New Project**
3. Name it `ceylora`, choose a strong password, select region **Southeast Asia (Singapore)** (closest to Sri Lanka)
4. Wait ~2 minutes for the project to spin up
5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

### Step 2 — Set Up the Database

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **+ New query**
3. Open the file `supabase/schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned" — this is correct

---

### Step 3 — Deploy to Vercel

1. Push this project to a GitHub repository:
   ```
   git init
   git add .
   git commit -m "Initial Ceylora deploy"
   git remote add origin https://github.com/YOUR_USERNAME/ceylora.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → Sign up with GitHub (free)

3. Click **Add New → Project** → Import your `ceylora` repository

4. In **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL     = https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY = your_anon_key_here
   ```

5. Click **Deploy** — Vercel builds and gives you a URL like `https://ceylora.vercel.app`

---

### Step 4 — Enable Email Confirmation (Optional but recommended)

1. In Supabase → **Authentication → Settings**
2. Under **Email Auth**, you can turn off "Confirm email" for easier testing
3. For production, keep it on so tenants verify their email

---

## How It Works

### Landlord Flow
1. Register at your Ceylora URL → select "Landlord"
2. Go to **Properties** → Add your property → Add units (e.g. "Unit 3A")
3. Ask tenants to register at the same URL → select "Tenant"
4. Go to **Tenants** → Assign Tenant → enter their registered full name
5. Dashboard shows all 7 summary cards + recent payments automatically

### Tenant Flow
1. Register at the Ceylora URL → select "Tenant"
2. Landlord assigns them to a unit
3. Tenant logs in → sees their unit, monthly rent, payment status
4. Tenant clicks **Pay Now** → enters amount, date, uploads receipt photo
5. Landlord sees it on Dashboard as "Pending" → clicks **Confirm**
6. Both landlord and tenant can view the receipt image

---

## Data Architecture (Expandable)

```
profiles          ← landlords and tenants (extends Supabase auth)
  └── properties  ← a landlord's buildings
        └── units ← individual rentable rooms/apartments
              └── tenancies  ← links tenant ↔ unit with date range
                    └── payments ← monthly rent records with receipt URLs
```

To add features later:
- **Maintenance requests** → add a `maintenance_requests` table linking to `units`
- **Tenancy agreements/PDFs** → add a `documents` table
- **Multiple landlords** → already supported (RLS isolates each landlord's data)
- **SMS notifications** → connect Supabase Edge Functions to a Sri Lanka SMS API (Dialog, Mobitel)

---

## Sri Lanka Legal Notes
- NIC field is included on all tenant profiles (required for formal tenancy)
- Rent Act No. 7 of 1972 and amendments are referenced in the Settings page
- All amounts in LKR
- Payment records serve as evidence for rent disputes

---

## Local Development

```bash
npm install
cp .env.example .env
# Fill in your Supabase URL and key in .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## File Structure

```
ceylora/
├── src/
│   ├── lib/supabase.js          ← Supabase client + storage helpers
│   ├── contexts/AuthContext.jsx ← auth state, login, register, signout
│   ├── components/ui/           ← Button, Input, Card, Table, Modal, Badge
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── landlord/
│   │   │   ├── LandlordLayout.jsx
│   │   │   ├── Dashboard.jsx    ← 7 summary cards + recent payments
│   │   │   ├── Properties.jsx   ← manage properties + units
│   │   │   ├── Tenants.jsx      ← assign + manage tenancies
│   │   │   ├── Payments.jsx     ← all payments, confirm pending
│   │   │   └── Settings.jsx
│   │   └── tenant/
│   │       ├── TenantLayout.jsx
│   │       ├── TenantOverview.jsx ← unit info, 12-month grid, pay + upload
│   │       └── TenantHistory.jsx  ← full payment history
│   └── App.jsx                  ← routes + role-based access
├── supabase/
│   └── schema.sql               ← paste into Supabase SQL editor
├── .env.example                 ← copy to .env, fill in keys
└── README.md
```
