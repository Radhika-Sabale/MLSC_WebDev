-- =============================================================================
-- Canteen Crowd: Database Schema
-- Stage 1 of 6: Base Tables, Indexes, and Row Level Security (RLS)
-- =============================================================================

-- Table 1: canteens
-- Stores public campus canteen records (UUID, unique URL slug, and display name).
CREATE TABLE IF NOT EXISTS public.canteens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- Table 2: canteen_secrets
-- Stores sensitive verification keys (qr_key) used to ensure users physically scan
-- a QR code located at the canteen before reporting crowd levels.
-- Tied 1:1 to canteens; deleting a canteen automatically cleans up its secret.
CREATE TABLE IF NOT EXISTS public.canteen_secrets (
    canteen_id UUID PRIMARY KEY REFERENCES public.canteens(id) ON DELETE CASCADE,
    qr_key TEXT NOT NULL
);

-- Table 3: reports
-- Stores individual crowd level submissions (1 = not busy, 2 = moderate, 3 = very busy).
-- Tracks an anonymous hashed device identifier and a submission timestamp.
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
    device_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes on public.reports:
-- 1. Accelerates querying recent crowd reports for a canteen (e.g., reports in last 15-30 minutes).
CREATE INDEX IF NOT EXISTS idx_reports_canteen_created_at
    ON public.reports (canteen_id, created_at DESC);

-- 2. Accelerates checking previous submissions per device per canteen for rate-limiting / cooldowns.
CREATE INDEX IF NOT EXISTS idx_reports_device_canteen_created_at
    ON public.reports (device_id, canteen_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable Row Level Security on all three tables to deny all access by default.
ALTER TABLE public.canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy on public.canteens:
-- Canteen directory details (names, slugs) are public information needed by web clients.
-- Allows both anonymous and authenticated roles to SELECT rows from canteens.
DROP POLICY IF EXISTS "Allow anon and authenticated to select canteens" ON public.canteens;
CREATE POLICY "Allow anon and authenticated to select canteens"
    ON public.canteens
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy on public.canteen_secrets:
-- NO policies are created. With RLS active and no policies, browser clients (anon / authenticated)
-- cannot read or write secrets directly. Verification must occur server-side via SECURITY DEFINER functions.

-- Policy on public.reports:
-- NO policies are created. Direct client SELECT/INSERT is blocked to prevent spoofing or unauthorized
-- data scraping. Report submissions and aggregations will be processed via SECURITY DEFINER functions in later stages.
