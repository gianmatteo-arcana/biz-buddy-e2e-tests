const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Checking if agent orchestration tables exist...\n');

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Navigate to the app
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for auth
  await page.waitForTimeout(2000);

  // Check tables using the Supabase client
  const tableCheck = await page.evaluate(async () => {
    // Import Supabase from window if available
    const supabase = window.supabase;
    if (!supabase) {
      return { error: 'Supabase client not found' };
    }

    const tablesToCheck = [
      'task_contexts',
      'ui_augmentation_requests',
      'ui_augmentation_responses',
      'agent_audit_trail',
      'input_requests'
    ];

    const results = {};

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        results[table] = {
          exists: !error,
          error: error?.message || null,
          hasData: data?.length > 0
        };
      } catch (e) {
        results[table] = {
          exists: false,
          error: e.message,
          hasData: false
        };
      }
    }

    return results;
  });

  console.log('📊 Table Check Results:\n');
  console.log(JSON.stringify(tableCheck, null, 2));

  await browser.close();
  
  console.log('\n✅ Check complete!');
  
  // Summary
  if (tableCheck.error) {
    console.log('\n❌ Error:', tableCheck.error);
  } else {
    const allExist = Object.values(tableCheck).every(t => t.exists);
    console.log(`\n${allExist ? '✅' : '❌'} All agent orchestration tables ${allExist ? 'exist' : 'are missing'}!`);
  }
})();