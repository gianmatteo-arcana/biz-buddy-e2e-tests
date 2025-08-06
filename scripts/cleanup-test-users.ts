/**
 * Test User Cleanup Script
 * 
 * SECURITY: This script should ONLY run on test environments
 * Never deploy this to production
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Security checks
function validateEnvironment() {
  const env = process.env.ENVIRONMENT || process.env.NODE_ENV;
  
  if (!env || !['test', 'staging', 'development'].includes(env)) {
    throw new Error('❌ Cleanup script can only run in test environments');
  }
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('❌ Missing Supabase credentials');
  }
  
  // Additional safety: check URL
  if (process.env.SUPABASE_URL.includes('prod')) {
    throw new Error('❌ Cannot run cleanup against production URL');
  }
  
  console.log(`✅ Running in ${env} environment`);
}

// Only cleanup specific test users
function isTestUser(email: string): boolean {
  const testPatterns = [
    /^bizbuddy\.test\.\d+@gmail\.com$/,
    /^test\.\d+@bizbuddy\.com$/,
    /@test\.bizbuddy\.com$/
  ];
  
  return testPatterns.some(pattern => pattern.test(email));
}

async function cleanupTestUsers() {
  try {
    // Validate we're in a safe environment
    validateEnvironment();
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // Read cleanup queue
    const queuePath = path.join(__dirname, '../test-results/cleanup-queue.json');
    let queue = [];
    
    try {
      const data = await fs.readFile(queuePath, 'utf-8');
      queue = JSON.parse(data);
    } catch {
      console.log('No cleanup queue found');
      return;
    }
    
    console.log(`Found ${queue.length} users to cleanup`);
    
    // Process each user
    for (const item of queue) {
      const { email, markedAt } = item;
      
      // Safety check
      if (!isTestUser(email)) {
        console.error(`❌ Skipping non-test user: ${email}`);
        continue;
      }
      
      // Additional time check - only cleanup if marked > 1 hour ago
      const markedTime = new Date(markedAt).getTime();
      const hourAgo = Date.now() - (60 * 60 * 1000);
      
      if (markedTime > hourAgo) {
        console.log(`⏳ Skipping ${email} - marked too recently`);
        continue;
      }
      
      try {
        console.log(`🧹 Cleaning up test user: ${email}`);
        
        // Option 1: Delete user completely (for test environments)
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === email);
        
        if (user) {
          await supabase.auth.admin.deleteUser(user.id);
          console.log(`✅ Deleted test user: ${email}`);
        } else {
          console.log(`ℹ️  User not found: ${email}`);
        }
        
        // Option 2: Just reset user data (safer)
        // await resetUserData(supabase, email);
        
      } catch (error) {
        console.error(`❌ Failed to cleanup ${email}:`, error);
      }
    }
    
    // Clear the queue
    await fs.writeFile(queuePath, '[]');
    console.log('\n✅ Cleanup complete');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Alternative: Reset user data instead of deletion
async function resetUserData(supabase: any, email: string) {
  // This approach keeps the user but resets their data
  // Safer but may not give true "first-time" experience
  
  const { data: userData } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
    
  if (userData) {
    // Reset profile to initial state
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        business_name: null,
        business_type: null,
        // ... other fields
      })
      .eq('email', email);
      
    // Delete related data
    await supabase
      .from('user_tasks')
      .delete()
      .eq('user_id', userData.id);
      
    console.log(`✅ Reset data for: ${email}`);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupTestUsers().catch(console.error);
}

export { cleanupTestUsers, isTestUser };