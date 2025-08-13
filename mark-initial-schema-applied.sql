-- Mark initial schema as already applied
-- Run this in Supabase SQL Editor if the tables already exist

-- First check if already marked
SELECT * FROM migration_history 
WHERE migration_name = '20250813_000000_initial_schema.sql';

-- If not present, mark as applied
INSERT INTO migration_history (
  migration_name, 
  migration_content,
  success,
  error_message,
  applied_at
) VALUES (
  '20250813_000000_initial_schema.sql',
  '-- Initial schema - Tables already existed, marking as applied retroactively',
  true,
  null,
  NOW()
) ON CONFLICT (migration_name) DO NOTHING;

-- Verify it was added
SELECT migration_name, success, applied_at 
FROM migration_history 
WHERE migration_name = '20250813_000000_initial_schema.sql';