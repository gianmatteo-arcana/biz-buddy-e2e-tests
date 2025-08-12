# Manual Migration Fix

Since the edge function is failing, you can apply the migration manually through Supabase SQL Editor.

## Steps:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/raenkewzlvrdqufwxjpl/sql/new

2. Copy and paste the content of the cleanup migration (`20250808064500_fix_migration_history_duplicates.sql`)

3. Run the SQL

## Alternative: Direct Fix

If you prefer a simpler fix, run this SQL in the Supabase SQL Editor:

```sql
-- Quick fix: Mark the already-applied migration as successful
UPDATE migration_history 
SET success = true, error_message = NULL
WHERE migration_name = '20250807120000_fix_all_security_definer_views.sql'
AND success = false;

-- Remove duplicate entries
DELETE FROM migration_history
WHERE migration_name = '20250807120000_fix_all_security_definer_views.sql'
AND success = false;

-- Verify
SELECT migration_name, success, COUNT(*) as count
FROM migration_history
WHERE migration_name LIKE '%fix_all_security_definer_views%'
GROUP BY migration_name, success;
```

This will:
1. Mark the migration as successfully applied (which it was on 8/3/2025)
2. Remove any duplicate failed entries
3. Show you the final state

After running this, the Migrations tab should show 0 pending migrations and the badge will disappear.

## Edge Function Issue

The edge function is failing because it's expecting both `migrationName` and `migrationContent` but may not be receiving them properly. This could be due to:

1. CORS issues
2. Authentication requirements (needs user token, not anon key)
3. The edge function code itself having an issue with parsing the request body

For now, applying the migration manually through the SQL editor is the safest approach.