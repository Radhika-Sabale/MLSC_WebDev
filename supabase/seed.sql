-- =============================================================================
-- Canteen Crowd: Seed Data
-- Stage 1 of 6: Seed Initial Canteens and Dynamic QR Secrets
-- =============================================================================

-- 1. Insert the three initial college canteens.
-- Safe to re-run: duplicates are skipped via unique constraint on slug.
INSERT INTO public.canteens (slug, name)
VALUES
    ('fruit-canteen', 'Fruit Canteen'),
    ('main-canteen', 'Main Canteen'),
    ('staff-canteen', 'Staff Canteen')
ON CONFLICT (slug) DO NOTHING;

-- 2. Dynamically generate and insert a secure 32-character QR key for each canteen.
-- Generated at insert time using gen_random_uuid() with dashes removed (no hard-coded secrets).
-- Safe to re-run: ON CONFLICT (canteen_id) DO NOTHING ensures existing keys are never overwritten.
INSERT INTO public.canteen_secrets (canteen_id, qr_key)
SELECT 
    id AS canteen_id,
    replace(gen_random_uuid()::text, '-', '') AS qr_key
FROM public.canteens
ON CONFLICT (canteen_id) DO NOTHING;

-- =============================================================================
-- DASHBOARD QUERY TO RETRIEVE GENERATED QR KEYS
-- Run the following SQL query in the Supabase SQL Editor to retrieve each canteen's
-- generated qr_key and the corresponding URL path for generating physical QR codes:
--
-- SELECT 
--     c.name,
--     c.slug,
--     s.qr_key,
--     '/c/' || c.slug || '?k=' || s.qr_key AS qr_url
-- FROM public.canteens c
-- JOIN public.canteen_secrets s ON c.id = s.canteen_id
-- ORDER BY c.name;
-- =============================================================================
