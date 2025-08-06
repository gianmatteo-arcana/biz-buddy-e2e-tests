const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDczODMsImV4cCI6MjA2ODYyMzM4M30.CvnbE8w1yEX4zYHjHmxRIpTlh4O7ZClbcNSEfYFGlag';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearBusinessInfo() {
  console.log('🧹 Clearing business info for test user...');
  
  try {
    // First, get auth state from saved file
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState: './.auth/user.json'
    });
    const page = await context.newPage();
    
    // Navigate to trigger auth
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(2000);
    
    // Get session from localStorage
    const session = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.includes('auth-token'));
      return key ? JSON.parse(localStorage.getItem(key)) : null;
    });
    
    if (!session?.access_token) {
      console.error('❌ No valid session found');
      await browser.close();
      return;
    }
    
    console.log('✅ Found valid session');
    
    // Use the authenticated client
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    });
    
    // Get current user
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      await browser.close();
      return;
    }
    
    console.log('👤 User ID:', user.id);
    console.log('📧 User email:', user.email);
    
    // Clear business info
    const { data, error } = await authClient
      .from('profiles')
      .update({ 
        business_name: null,
        business_type: null,
        business_address: null,
        business_phone: null,
        business_ein: null,
        business_formation_date: null,
        business_structure: null
      })
      .eq('user_id', user.id);
    
    if (error) {
      console.error('❌ Error clearing business info:', error);
    } else {
      console.log('✅ Business info cleared successfully');
      
      // Verify the update
      const { data: profile, error: fetchError } = await authClient
        .from('profiles')
        .select('business_name, business_type')
        .eq('user_id', user.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching updated profile:', fetchError);
      } else {
        console.log('📊 Updated profile:', profile);
        console.log('✅ User should now see onboarding on next login');
      }
    }
    
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearBusinessInfo();