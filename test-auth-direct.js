const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('🔐 Testing BizBuddy with stored auth...\n');
  
  // First, restore the auth state
  const authState = {
    "cookies": [
      {
        "name": "sb-raenkewzlvrdqufwxjpl-auth-token",
        "value": "eyJhbGciOiJIUzI1NiIsImtpZCI6Im52ZGliRVo0YVhldkpacHIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3JhZW5rZXd6bHZyZHF1Znd4anBsLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4ZThlYTdiZC1iN2ZiLTRlNzctOGUzNC1hYTU1MWZlMjY5MzQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0NDM5ODc5LCJpYXQiOjE3NTQ0MzYyNzksImVtYWlsIjoiZ2lhbm1hdHRlby5hbGx5bi50ZXN0QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS0JoTGx0aWJFelZMMEpCdG02UVZncHNidnlYeUpUWlRSWHdVSnZOYWhmTXFfTDNnPXM5Ni1jIiwiZW1haWwiOiJnaWFubWF0dGVvLmFsbHluLnRlc3RAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkdpYW5tYXR0ZW8gQWxseW4iLCJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYW1lIjoiR2lhbm1hdHRlbyBBbGx5biIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0tCaExsdGliRXpWTDBKQnRtNlFWZ3BzYnZ5WHlKVFpUUlh3VUp2TmFoZk1xX0wzZz1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTEzOTk2NzM3NjA5NjYxNjYzNTAwIiwic3ViIjoiMTEzOTk2NzM3NjA5NjYxNjYzNTAwIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3NTQ0MzYyNzl9XSwic2Vzc2lvbl9pZCI6ImZiMmI0ZDFhLWQ1MWItNGI3Zi05ZDQ0LTM1N2UyYjVmZDljNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.cz0rEUHaFTCeAHs-cU63NVCqcaeK6dg7gl6e8qPEcWU",
        "domain": "c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com",
        "path": "/",
        "httpOnly": true,
        "secure": true,
        "sameSite": "Lax"
      }
    ],
    "origins": [
      {
        "origin": "https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com",
        "localStorage": [
          {
            "name": "sb-raenkewzlvrdqufwxjpl-auth-token",
            "value": "{\"provider_token\":\"ya29.a0AS3H6NxHCD0HlhuI3qinelgErHrDpb6K20wfyM-Rhx9irAHEMPrB9i_mV0-sKa0Q-vFWqwSsZNmRNpA_MtfyfeP1yF0W624EU2lcyA0eHg9DqpUHKxku-xM7Zh16tSVKybqHV3QhyxnqLqix0ajHe0zY8TTSb6Wakd89tEMHaCgYKAc8SARESFQHGX2MiQOx7aFIrOQf_33FkUF9ziw0175\",\"provider_refresh_token\":\"1//06tcqkmlRQaotCgYIARAAGAYSNwF-L9IreOScAlqZZsDc0CASPf-WIMt-HFoyZqhCmoY9nK_PXGRzO91sX3GvHD9Mw4vY66T-h7E\",\"access_token\":\"eyJhbGciOiJIUzI1NiIsImtpZCI6Im52ZGliRVo0YVhldkpacHIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3JhZW5rZXd6bHZyZHF1Znd4anBsLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4ZThlYTdiZC1iN2ZiLTRlNzctOGUzNC1hYTU1MWZlMjY5MzQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0NDM5ODc5LCJpYXQiOjE3NTQ0MzYyNzksImVtYWlsIjoiZ2lhbm1hdHRlby5hbGx5bi50ZXN0QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS0JoTGx0aWJFelZMMEpCdG02UVZncHNidnlYeUpUWlRSWHdVSnZOYWhmTXFfTDNnPXM5Ni1jIiwiZW1haWwiOiJnaWFubWF0dGVvLmFsbHluLnRlc3RAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkdpYW5tYXR0ZW8gQWxseW4iLCJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYW1lIjoiR2lhbm1hdHRlbyBBbGx5biIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0tCaExsdGliRXpWTDBKQnRtNlFWZ3BzYnZ5WHlKVFpUUlh3VUp2TmFoZk1xX0wzZz1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTEzOTk2NzM3NjA5NjYxNjYzNTAwIiwic3ViIjoiMTEzOTk2NzM3NjA5NjYxNjYzNTAwIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3NTQ0MzYyNzl9XSwic2Vzc2lvbl9pZCI6ImZiMmI0ZDFhLWQ1MWItNGI3Zi05ZDQ0LTM1N2UyYjVmZDljNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.cz0rEUHaFTCeAHs-cU63NVCqcaeK6dg7gl6e8qPEcWU\",\"expires_in\":3600,\"expires_at\":1754439879,\"refresh_token\":\"fxn6t4eei77a\",\"token_type\":\"bearer\",\"user\":{\"id\":\"8e8ea7bd-b7fb-4e77-8e34-aa551fe26934\",\"aud\":\"authenticated\",\"role\":\"authenticated\",\"email\":\"gianmatteo.allyn.test@gmail.com\",\"email_confirmed_at\":\"2025-08-05T21:53:32.589138Z\",\"phone\":\"\",\"confirmed_at\":\"2025-08-05T21:53:32.589138Z\",\"last_sign_in_at\":\"2025-08-05T23:24:39.083724Z\",\"app_metadata\":{\"provider\":\"google\",\"providers\":[\"google\"]},\"user_metadata\":{\"avatar_url\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"email\":\"gianmatteo.allyn.test@gmail.com\",\"email_verified\":true,\"full_name\":\"Gianmatteo Allyn\",\"iss\":\"https://accounts.google.com\",\"name\":\"Gianmatteo Allyn\",\"phone_verified\":false,\"picture\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"provider_id\":\"113996737609661663500\",\"sub\":\"113996737609661663500\"},\"identities\":[{\"identity_id\":\"54f7db0b-1efd-421c-8c7f-3f4edf7e1fdc\",\"id\":\"113996737609661663500\",\"user_id\":\"8e8ea7bd-b7fb-4e77-8e34-aa551fe26934\",\"identity_data\":{\"avatar_url\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"email\":\"gianmatteo.allyn.test@gmail.com\",\"email_verified\":true,\"full_name\":\"Gianmatteo Allyn\",\"iss\":\"https://accounts.google.com\",\"name\":\"Gianmatteo Allyn\",\"phone_verified\":false,\"picture\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"provider_id\":\"113996737609661663500\",\"sub\":\"113996737609661663500\"},\"provider\":\"google\",\"last_sign_in_at\":\"2025-08-05T21:53:32.576541Z\",\"created_at\":\"2025-08-05T21:53:32.576591Z\",\"updated_at\":\"2025-08-05T23:24:39.077936Z\",\"email\":\"gianmatteo.allyn.test@gmail.com\"}],\"created_at\":\"2025-08-05T21:53:32.553994Z\",\"updated_at\":\"2025-08-05T23:24:39.089757Z\",\"is_anonymous\":false}}"
          }
        ]
      }
    ]
  };
  
  // Save auth state
  fs.writeFileSync('.auth/user-state.json', JSON.stringify(authState, null, 2));
  console.log('✅ Auth state restored\n');
  
  // Launch browser with auth state
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  // Create context with auth state
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Navigate directly to the app
  console.log('Navigating to BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check what we see
  const url = page.url();
  console.log('Current URL:', url);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/auth-test.png' });
  console.log('Screenshot saved to test-results/auth-test.png');
  
  // Check for authentication indicators
  console.log('\\nChecking authentication status...');
  
  const checks = [
    { selector: 'text=Dashboard', name: 'Dashboard' },
    { selector: 'text=Welcome to BizBuddy!', name: 'Welcome screen' },
    { selector: 'text=Sign in with Google', name: 'Sign in button' },
    { selector: '[data-testid="user-menu"]', name: 'User menu' }
  ];
  
  for (const check of checks) {
    const visible = await page.locator(check.selector).isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`${visible ? '✅' : '❌'} ${check.name}`);
  }
  
  console.log('\\nKeeping browser open. Press Ctrl+C to close.');
  await new Promise(() => {});
})();