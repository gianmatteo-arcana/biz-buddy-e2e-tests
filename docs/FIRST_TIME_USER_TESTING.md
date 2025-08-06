# First-Time User Testing Strategy

## 🔒 Security First Approach

Testing first-time users requires careful consideration to avoid creating security vulnerabilities. Here are several approaches, ranked by security.

## Recommended Approaches

### 1. Test User Pool with Rotation (Most Secure)

Create a pool of pre-configured test Google accounts that rotate through states:

```typescript
// test-users.config.ts
export const TEST_USERS = {
  'fresh-user-1@yourdomain.com': { lastUsed: null, status: 'available' },
  'fresh-user-2@yourdomain.com': { lastUsed: null, status: 'available' },
  'fresh-user-3@yourdomain.com': { lastUsed: null, status: 'available' },
};
```

**Implementation:**
1. Create Google Workspace test accounts
2. Before each test, mark user as "in-use"
3. After test, mark for cleanup
4. Nightly job resets test users (see below)

### 2. Test Environment with Auto-Cleanup

Use a separate test environment with automated cleanup:

```typescript
// playwright.config.test-env.ts
export default defineConfig({
  use: {
    baseURL: process.env.TEST_ENV_URL || 'https://test.bizbuddy.com',
  },
});
```

**Cleanup Options:**

#### A. Time-based Cleanup (Recommended)
```sql
-- Runs nightly on test environment only
DELETE FROM users 
WHERE email LIKE '%@test.bizbuddy.com' 
AND created_at < NOW() - INTERVAL '24 hours';
```

#### B. Test API Endpoint (Development Only)
```typescript
// Edge function - ONLY deployed to test environment
export async function cleanupTestUser(email: string) {
  // Verify test environment
  if (process.env.ENVIRONMENT !== 'test') {
    throw new Error('Cleanup only allowed in test environment');
  }
  
  // Verify test email pattern
  if (!email.match(/@test\.bizbuddy\.com$/)) {
    throw new Error('Can only cleanup test emails');
  }
  
  // Additional security: verify caller
  const apiKey = req.headers.get('X-Test-Api-Key');
  if (apiKey !== process.env.TEST_CLEANUP_KEY) {
    throw new Error('Unauthorized');
  }
  
  // Cleanup user
  await supabase.auth.admin.deleteUser(userId);
}
```

### 3. Mock User Creation (Most Complex, Most Secure)

Create temporary users that exist only in memory:

```typescript
// Requires backend support
interface TestUserSession {
  id: string;
  email: string;
  expiresAt: Date;
}

// Backend endpoint
export async function createEphemeralUser() {
  const testUser = {
    id: `test_${crypto.randomUUID()}`,
    email: `test_${Date.now()}@ephemeral.local`,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  };
  
  // Store in Redis/memory, not database
  await redis.setex(`test_user_${testUser.id}`, 3600, JSON.stringify(testUser));
  
  return testUser;
}
```

## Implementation Guide

### Step 1: Choose Your Approach

For BizBuddy, I recommend **Approach 1 (Test User Pool)** because:
- No database access needed from tests
- Works with real Google OAuth
- No risk to production data
- Easy to implement

### Step 2: Create Test Infrastructure

```typescript
// tests/helpers/test-user-manager.ts
export class TestUserManager {
  private static TEST_USER_PREFIX = 'bizbuddy.test.user';
  
  async getAvailableTestUser(): Promise<TestUser> {
    // Get list of test users from config
    const users = await this.loadTestUsers();
    
    // Find available user
    const available = users.find(u => u.status === 'available');
    if (!available) {
      throw new Error('No test users available');
    }
    
    // Mark as in-use
    await this.markUserInUse(available.email);
    
    return available;
  }
  
  async releaseTestUser(email: string): Promise<void> {
    // Mark user as needing cleanup
    await this.markUserForCleanup(email);
  }
  
  private async loadTestUsers(): Promise<TestUser[]> {
    // Load from secure config or environment
    return JSON.parse(process.env.TEST_USERS || '[]');
  }
}
```

### Step 3: Write First-Time User Test

```typescript
import { test, expect } from '@playwright/test';
import { TestUserManager } from '../helpers/test-user-manager';

test.describe('First-Time User Experience', () => {
  let testUserManager: TestUserManager;
  let testUser: TestUser;
  
  test.beforeAll(async () => {
    testUserManager = new TestUserManager();
    testUser = await testUserManager.getAvailableTestUser();
  });
  
  test.afterAll(async () => {
    // Release user for cleanup
    if (testUser) {
      await testUserManager.releaseTestUser(testUser.email);
    }
  });
  
  test('new user sees onboarding flow', async ({ page }) => {
    // Use test user credentials
    await page.goto('/');
    await page.click('text=Sign in with Google');
    
    // Login with test user
    await loginWithTestUser(page, testUser);
    
    // Verify first-time user experience
    await expect(page.locator('text=Welcome to BizBuddy!')).toBeVisible();
    await expect(page.locator('[data-testid="onboarding-start"]')).toBeVisible();
    
    // Complete onboarding
    await page.click('text=Get Started');
    // ... rest of onboarding test
  });
});
```

### Step 4: Implement Cleanup

```bash
# cleanup-test-users.sh
#!/bin/bash

# This runs nightly on test environment only
# Uses Supabase CLI or admin API

# For each test user marked for cleanup:
# 1. Delete user data
# 2. Reset user state
# 3. Mark as available again

supabase functions invoke cleanup-test-users \
  --env test \
  --data '{"dryRun": false}'
```

## Security Checklist

✅ **DO:**
- Use separate test environment
- Limit cleanup to specific email patterns
- Require authentication for cleanup operations
- Log all cleanup activities
- Use time-based restrictions
- Implement rate limiting

❌ **DON'T:**
- Create cleanup endpoints in production
- Use wildcards without restrictions
- Allow arbitrary user deletion
- Store test credentials in code
- Skip authentication checks

## Alternative: Manual Testing Protocol

For maximum security with less automation:

1. **Create test checklist:**
   ```markdown
   - [ ] Use incognito/private browser
   - [ ] Use designated test Google account
   - [ ] Document test user email
   - [ ] Complete first-time flow
   - [ ] Request cleanup via secure channel
   ```

2. **Cleanup process:**
   - Developer requests cleanup via Slack/ticket
   - Admin verifies test account
   - Admin runs cleanup command
   - Confirmation sent to developer

## Recommended Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Test Suite    │────▶│  Test User API  │────▶│  Test Database  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         │                       ▼                         │
         │              ┌─────────────────┐               │
         │              │  Auth Service   │               │
         │              └─────────────────┘               │
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Test User Pool  │     │  Cleanup Job    │     │   Audit Log     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Next Steps

1. **Decide on approach** based on your security requirements
2. **Create test Google accounts** (if using real OAuth)
3. **Implement cleanup mechanism** for your chosen approach
4. **Add monitoring** to ensure cleanup is working
5. **Document the process** for your team

The key is balancing test reliability with security. Start with manual processes and gradually automate as you validate the security model.