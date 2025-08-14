# 🔧 MANUAL BOOTSTRAP INSTRUCTIONS

## Root Cause of HTTP 500 Errors
The edge functions are failing because the `exec_migration_sql` function is missing from the database. This is a chicken-and-egg problem: the migration system needs this function to apply migrations, but the function itself is defined in a migration.

## 🎯 SOLUTION: Manual Bootstrap

### Step 1: Go to Supabase SQL Editor
1. Navigate to: https://supabase.com/dashboard/project/raenkewzlvrdqufwxjpl/sql/new
2. Login if needed

### Step 2: Execute Bootstrap SQL
Copy and paste this SQL, then click "Run":

```sql
-- Bootstrap migration: Create exec_migration_sql function
-- This function is required for the edge function to execute migrations

CREATE OR REPLACE FUNCTION public.exec_migration_sql(migration_sql TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Execute the provided SQL
  EXECUTE migration_sql;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Migration execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to service role (edge functions use service role)
GRANT EXECUTE ON FUNCTION public.exec_migration_sql(TEXT) TO service_role;

-- Add comment documenting this function
COMMENT ON FUNCTION public.exec_migration_sql(TEXT) IS 'Executes migration SQL for the migration runner system. Used by edge functions with service role.';

-- Mark this bootstrap migration as applied in history
INSERT INTO migration_history (
  migration_name,
  migration_content,
  success,
  applied_at,
  applied_by,
  execution_time_ms
) VALUES (
  '20250813_000001_create_exec_migration_function.sql',
  'Bootstrap migration - exec_migration_sql function created',
  true,
  NOW(),
  null,
  0
) ON CONFLICT (migration_name) DO UPDATE SET
  success = EXCLUDED.success,
  applied_at = EXCLUDED.applied_at;
```

### Step 3: Verify Success
You should see a success message like "Success: 5 rows affected" or similar.

### Step 4: Test Edge Functions
After the function is created, the edge functions should work without HTTP 500 errors.

## 🚀 AFTER BOOTSTRAP: Apply Remaining Migrations

Once the bootstrap function is created, run:

```bash
cd /Users/gianmatteo/Documents/Arcana-Prototype-2/biz-buddy-e2e-tests
node apply-migrations-after-bootstrap.js
```

This will apply all remaining migrations via E2E automation to achieve zero pending.

## ✅ Expected Result
- ✅ No more HTTP 500 errors from edge functions
- ✅ Migrations can be applied successfully via UI
- ✅ Zero pending migrations achieved
- ✅ Original mission complete!