/**
 * Fix migration_history table schema
 * 
 * The edge functions are failing because they expect columns that don't exist:
 * - "notes" column
 * - "heal_reason" column
 * 
 * This script will add these missing columns via SQL Editor.
 */

console.log('🔧 FIXING migration_history TABLE SCHEMA');
console.log('=======================================');
console.log('');
console.log('🔥 ROOT CAUSE: Edge functions expect columns that dont exist in migration_history table:');
console.log('   ❌ "notes" column missing');
console.log('   ❌ "heal_reason" column missing');
console.log('');
console.log('📋 SOLUTION: Add missing columns to migration_history table');
console.log('');
console.log('🎯 MANUAL FIX REQUIRED:');
console.log('1. Go to https://supabase.com/dashboard/project/raenkewzlvrdqufwxjpl/sql/new');
console.log('2. Execute this SQL:');
console.log('');
console.log('------- SQL TO RUN -------');
console.log(`
-- Add missing columns to migration_history table
-- These columns are expected by the edge functions but don't exist

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'migration_history' 
    AND column_name = 'notes' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.migration_history ADD COLUMN notes TEXT;
    COMMENT ON COLUMN public.migration_history.notes IS 'Additional notes about the migration application';
  END IF;
END $$;

-- Add heal_reason column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'migration_history' 
    AND column_name = 'heal_reason' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.migration_history ADD COLUMN heal_reason TEXT;
    COMMENT ON COLUMN public.migration_history.heal_reason IS 'Reason for self-healing if migration was auto-healed';
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'migration_history' 
AND table_schema = 'public' 
ORDER BY ordinal_position;
`);
console.log('------- END SQL -------');
console.log('');
console.log('3. After running the SQL, try applying migrations again');
console.log('4. This should fix the HTTP 500 errors!');
console.log('');
console.log('🎯 Expected result: Edge functions will work and migrations can be applied successfully');

process.exit(0);