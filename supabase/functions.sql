-- =============================================================================
-- Canteen Crowd: Server-Side Functions (RPC)
-- Stage 2 of 6: submit_report and get_status
-- =============================================================================

-- Why SECURITY DEFINER and fixed search_path:
-- 1. SECURITY DEFINER ensures the functions execute with the database owner's privileges.
--    This allows them to read canteen_secrets and insert/delete reports while browser
--    clients remain completely blocked from direct table access by Row Level Security (RLS).
-- 2. "SET search_path = public" is a critical security safeguard that prevents
--    search_path hijacking attacks, ensuring all table and function references resolve
--    strictly within the trusted public schema.

-- -----------------------------------------------------------------------------
-- Function 1: submit_report
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_report(
    p_slug   TEXT,
    p_key    TEXT,
    p_device TEXT,
    p_level  INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Named configuration constants
    c_cooldown_minutes CONSTANT INT := 15;
    c_cleanup_hours    CONSTANT INT := 24;
    c_min_device_len   CONSTANT INT := 8;
    c_max_device_len   CONSTANT INT := 64;

    -- Local state variables
    v_canteen_id       UUID;
    v_last_report_at   TIMESTAMPTZ;
    v_elapsed_seconds  NUMERIC;
    v_retry_after      INT;
BEGIN
    -- 1. Input validation:
    -- p_level must be 1, 2, or 3. p_device must be between 8 and 64 characters.
    IF p_level IS NULL OR p_level NOT IN (1, 2, 3)
       OR p_device IS NULL OR length(p_device) < c_min_device_len OR length(p_device) > c_max_device_len THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
    END IF;

    -- 2. Look up canteen and verify QR secret key:
    -- If the slug does not exist OR the key does not match, return {"ok": false, "reason": "bad_key"}.
    -- The identical response prevents attackers from enumerating valid canteen slugs.
    SELECT c.id INTO v_canteen_id
    FROM public.canteens c
    JOIN public.canteen_secrets s ON c.id = s.canteen_id
    WHERE c.slug = p_slug AND s.qr_key = p_key;

    IF v_canteen_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'bad_key');
    END IF;

    -- 3. Concurrency serialization:
    -- Take a transaction-level advisory lock on hashtext(p_device || ':' || canteen_id::text)
    -- so simultaneous concurrent requests from the same device cannot race past the cooldown check.
    PERFORM pg_advisory_xact_lock(hashtext(p_device || ':' || v_canteen_id::TEXT));

    -- 4. Cooldown verification:
    -- Find this device's most recent report for this canteen.
    SELECT created_at INTO v_last_report_at
    FROM public.reports
    WHERE canteen_id = v_canteen_id AND device_id = p_device
    ORDER BY created_at DESC
    LIMIT 1;

    -- If submitted less than 15 minutes ago, calculate seconds remaining rounded up.
    IF v_last_report_at IS NOT NULL AND v_last_report_at > now() - (c_cooldown_minutes || ' minutes')::INTERVAL THEN
        v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_last_report_at));
        v_retry_after := CEIL((c_cooldown_minutes * 60) - v_elapsed_seconds)::INT;
        IF v_retry_after < 1 THEN
            v_retry_after := 1;
        END IF;

        RETURN jsonb_build_object(
            'ok', false,
            'reason', 'cooldown',
            'retry_after_seconds', v_retry_after
        );
    END IF;

    -- 5. Insert the crowd report:
    INSERT INTO public.reports (canteen_id, level, device_id, created_at)
    VALUES (v_canteen_id, p_level::SMALLINT, p_device, now());

    -- 6. Cheap cleanup:
    -- Prune reports older than 24 hours across all canteens to keep storage lean.
    DELETE FROM public.reports
    WHERE created_at < now() - (c_cleanup_hours || ' hours')::INTERVAL;

    -- 7. Success:
    RETURN jsonb_build_object('ok', true);
END;
$$;

-- -----------------------------------------------------------------------------
-- Function 2: get_status
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_status(
    p_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Named configuration constants
    c_window_minutes  CONSTANT INT := 20;
    c_min_reports     CONSTANT INT := 2;

    -- Local state variables
    v_canteen_id      UUID;
    v_report_count    INT;
    v_last_report_at  TIMESTAMPTZ;
    v_median_level    SMALLINT;
BEGIN
    -- 1. Check if the canteen exists:
    SELECT id INTO v_canteen_id
    FROM public.canteens
    WHERE slug = p_slug;

    -- If slug does not exist, return defaults:
    IF v_canteen_id IS NULL THEN
        RETURN jsonb_build_object(
            'level', NULL,
            'report_count', 0,
            'last_report_at', NULL
        );
    END IF;

    -- 2. Aggregate reports from the sliding window (last 20 minutes):
    SELECT 
        COUNT(*)::INT,
        MAX(created_at),
        percentile_disc(0.5) WITHIN GROUP (ORDER BY level)
    INTO 
        v_report_count,
        v_last_report_at,
        v_median_level
    FROM public.reports
    WHERE canteen_id = v_canteen_id
      AND created_at >= now() - (c_window_minutes || ' minutes')::INTERVAL;

    -- 3. Confidence threshold:
    -- If report_count is less than 2, return level as null (insufficient sample size),
    -- but still return count and last_report_at.
    IF v_report_count < c_min_reports THEN
        v_median_level := NULL;
    END IF;

    -- 4. Return result object:
    RETURN jsonb_build_object(
        'level', v_median_level,
        'report_count', v_report_count,
        'last_report_at', v_last_report_at
    );
END;
$$;
