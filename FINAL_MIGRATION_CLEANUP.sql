-- ============================================================
-- FINAL MIGRATION CLEANUP SCRIPT
-- Run this in Supabase SQL Editor to clean up pending migrations
-- ============================================================

-- Step 1: Clean up any failed migration attempts
DELETE FROM migration_history 
WHERE success = false 
AND migration_name IN (
  '20250813010809_demo_comment_update.sql',
  '20250813_000000_initial_schema.sql'
);

-- Step 2: Apply the demo comment migration (safe, only adds comments)
COMMENT ON TABLE public.businesses IS 'Core business entities - Updated via E2E migration demo on 2025-08-13';
COMMENT ON COLUMN public.businesses.name IS 'Business name - Migration system demo verified';
COMMENT ON TABLE public.migration_history IS 'Migration tracking system - E2E verified 2025-08-13';

-- Step 3: Mark demo comment migration as applied
INSERT INTO migration_history (
  migration_name,
  migration_content,
  success,
  applied_at,
  applied_by,
  error_message
) VALUES (
  '20250813010809_demo_comment_update.sql',
  '-- Demo Migration: Add Documentation Comment
-- This is a benign schema change for E2E testing demonstration
COMMENT ON TABLE public.businesses IS ''Core business entities - Updated via E2E migration demo on 2025-08-13'';
COMMENT ON COLUMN public.businesses.name IS ''Business name - Migration system demo verified'';
COMMENT ON TABLE public.migration_history IS ''Migration tracking system - E2E verified 2025-08-13'';',
  true,
  NOW(),
  'manual-cleanup',
  NULL
) ON CONFLICT (migration_name) 
DO UPDATE SET 
  success = true,
  error_message = NULL,
  applied_at = NOW(),
  applied_by = 'manual-cleanup';

-- Step 4: Mark initial_schema as already applied (tables already exist)
INSERT INTO migration_history (
  migration_name,
  migration_content,
  success,
  applied_at,
  applied_by,
  error_message,
  tables_created
) VALUES (
  '20250813_000000_initial_schema.sql',
  '-- Initial schema - Tables already existed before migration system
-- Marked as applied retroactively for migration system consistency',
  true,
  NOW(),
  'manual-cleanup',
  NULL,
  ARRAY['businesses', 'business_users', 'business_credentials']::text[]
) ON CONFLICT (migration_name) 
DO UPDATE SET 
  success = true,
  error_message = NULL,
  applied_at = NOW(),
  applied_by = 'manual-cleanup';

-- Step 5: Verify the cleanup
SELECT 
  migration_name,
  success,
  applied_at,
  applied_by
FROM migration_history
WHERE migration_name IN (
  '20250813010809_demo_comment_update.sql',
  '20250813_000000_initial_schema.sql'
)
ORDER BY applied_at DESC;

-- Expected result: Both migrations should show success = true