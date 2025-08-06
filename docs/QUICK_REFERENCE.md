# Quick Reference

## 🎯 Common Commands

### Daily Development
```bash
npm run auth:check          # Check if auth is valid
npm run auth:refresh        # Capture new auth (if expired)
npm test                    # Run all tests
```

### Running Specific Tests
```bash
# Authenticated tests (fast)
npx playwright test tests/e2e/full-auth-flow.spec.ts

# Fresh signup test (interactive)
npm run test:manual-signup

# Debug mode
npx playwright test --debug
```

## 🔐 Auth Token Lifecycle

```
Fresh Start → npm run auth:refresh → Sign in manually → Auto-saves auth
     ↓
Run tests → Auth valid for ~1 hour → Token expires
     ↓
npm run auth:check → Shows "valid: false" → Back to Fresh Start
```

## 🚨 Quick Fixes

| Problem | Solution |
|---------|----------|
| "Sign in button not found" | Auth expired → `npm run auth:refresh` |
| "Loading spinner forever" | Add wait → `await page.waitForTimeout(5000)` |
| "Test times out" | Increase timeout → `test.setTimeout(60000)` |
| "Can't automate Google login" | Use → `npm run test:manual-signup` |

## 📝 Test Template

```typescript
import { test, expect } from '@playwright/test';

test('your test name', async ({ page }) => {
  // Go to page
  await page.goto('https://your-app.lovableproject.com');
  
  // Wait for load
  await page.waitForTimeout(3000);
  
  // Check element
  await expect(page.locator('text=Dashboard')).toBeVisible();
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/your-test.png' });
});
```

## 🔍 Debugging

```bash
# See what's happening
npm run test:headed

# Step through code
npx playwright test --debug

# UI mode (best for debugging)
npm run test:ui

# Check screenshots
ls test-results/*.png
```