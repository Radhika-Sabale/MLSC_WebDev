-- =============================================================================
-- Canteen Crowd: Server Function Manual Tests
-- Run these queries sequentially in the Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 0: Look up the real key for 'fruit-canteen' to replace 'PASTE_REAL_KEY_HERE'
-- -----------------------------------------------------------------------------
SELECT c.slug, s.qr_key
FROM public.canteens c
JOIN public.canteen_secrets s ON c.id = s.canteen_id
WHERE c.slug = 'fruit-canteen';

-- Note: Replace 'PASTE_REAL_KEY_HERE' below with the actual qr_key from the query above.


-- -----------------------------------------------------------------------------
-- Test 1: Submit a valid report
-- Expected Result: {"ok": true}
-- -----------------------------------------------------------------------------
SELECT public.submit_report(
    'fruit-canteen',
    'PASTE_REAL_KEY_HERE',
    'test-device-0001',
    2
);


-- -----------------------------------------------------------------------------
-- Test 2: Immediate duplicate report from same device (Cooldown enforcement)
-- Expected Result: {"ok": false, "reason": "cooldown", "retry_after_seconds": 900} (or ~899)
-- -----------------------------------------------------------------------------
SELECT public.submit_report(
    'fruit-canteen',
    'PASTE_REAL_KEY_HERE',
    'test-device-0001',
    2
);


-- -----------------------------------------------------------------------------
-- Test 3: Submit with an invalid/wrong key
-- Expected Result: {"ok": false, "reason": "bad_key"}
-- -----------------------------------------------------------------------------
SELECT public.submit_report(
    'fruit-canteen',
    'wrong-key-value',
    'test-device-0001',
    2
);


-- -----------------------------------------------------------------------------
-- Test 4: Submit with an invalid crowd level (e.g. 5 instead of 1, 2, or 3)
-- Expected Result: {"ok": false, "reason": "invalid_input"}
-- -----------------------------------------------------------------------------
SELECT public.submit_report(
    'fruit-canteen',
    'PASTE_REAL_KEY_HERE',
    'test-device-0001',
    5
);


-- -----------------------------------------------------------------------------
-- Test 5: Check status with only 1 report
-- Expected Result: {"level": null, "report_count": 1, "last_report_at": "<ISO-timestamp>"}
-- (Level is null because confidence threshold requires at least 2 reports)
-- -----------------------------------------------------------------------------
SELECT public.get_status('fruit-canteen');


-- -----------------------------------------------------------------------------
-- Test 6: Submit a second report from a DIFFERENT device, then check status again
-- 6a. Submission Expected Result: {"ok": true}
-- 6b. Status Expected Result: {"level": 2, "report_count": 2, "last_report_at": "<ISO-timestamp>"}
-- -----------------------------------------------------------------------------
SELECT public.submit_report(
    'fruit-canteen',
    'PASTE_REAL_KEY_HERE',
    'test-device-0002',
    2
);

SELECT public.get_status('fruit-canteen');


-- -----------------------------------------------------------------------------
-- Test 7: Check status for a non-existent canteen slug
-- Expected Result: {"level": null, "report_count": 0, "last_report_at": null}
-- -----------------------------------------------------------------------------
SELECT public.get_status('non-existent-canteen');


-- -----------------------------------------------------------------------------
-- Test 8: Cleanup test rows
-- Removes all test reports created during testing
-- -----------------------------------------------------------------------------
DELETE FROM public.reports
WHERE device_id LIKE 'test-device-%';
