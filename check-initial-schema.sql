-- Check if initial schema tables already exist
-- If they do, mark the migration as applied

-- Check if core tables exist
SELECT 
  'businesses' as table_name,
  EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'businesses' AND schemaname = 'public') as exists
UNION ALL
SELECT 
  'business_users',
  EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'business_users' AND schemaname = 'public')
UNION ALL
SELECT 
  'contexts',
  EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'contexts' AND schemaname = 'public')
UNION ALL
SELECT 
  'context_events',
  EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'context_events' AND schemaname = 'public')
UNION ALL
SELECT 
  'migration_history',
  EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'migration_history' AND schemaname = 'public');

-- If all tables exist, you can mark the migration as applied:
-- INSERT INTO migration_history (
--   migration_name, 
--   migration_content,
--   success,
--   error_message
-- ) VALUES (
--   '20250813_000000_initial_schema.sql',
--   '-- Already existed, marking as applied retroactively',
--   true,
--   null
-- );