# E2E Testing Standards - Claude Code Guidelines

## 🚨 CRITICAL: USE THE STANDARDIZED E2E TEST FRAMEWORK

**ALL E2E user story tests MUST use the BaseUserStoryTest framework located in `framework/BaseUserStoryTest.js`**

### Framework Documentation
- **Main Documentation**: `E2E_TEST_FRAMEWORK.md` - READ THIS FIRST
- **Base Class**: `framework/BaseUserStoryTest.js` - DO NOT MODIFY
- **Template**: `framework/UserStoryTemplate.js` - Copy for new tests
- **Example**: `test-arcana-dwell-user-story.js` - Reference implementation

### Creating New E2E Tests - MANDATORY PROCESS
1. Copy `framework/UserStoryTemplate.js` to new file
2. Update config with user story details and ground truths
3. Implement `runUserStory()` method with test logic
4. Add to `test-suite.js` for suite execution
5. Run with `node test-[name]-story.js`

**NEVER create standalone E2E tests outside this framework!**

## 🎯 MANDATORY: Use Playwright Only

**CRITICAL**: All E2E tests MUST use Playwright. Do NOT use Puppeteer.

### ✅ Authentication Solution (PROVEN WORKING)

**The ONLY way to handle Supabase authentication in E2E tests:**

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  storageState: '.auth/user-state.json',  // This is the key!
});
const page = await context.newPage();
```

### ❌ What Does NOT Work

**NEVER use localStorage injection with Puppeteer:**
```javascript
// THIS APPROACH FAILS - DO NOT USE
localStorage.setItem('sb-raenkewzlvrdqufwxjpl-auth-token', JSON.stringify({
  currentSession: authSession,
  expiresAt: Date.now() + 3600000
}));
```

**Why it fails:**
- Supabase auth uses multiple storage mechanisms (localStorage, sessionStorage, HTTP-only cookies)
- localStorage injection only handles one piece of the authentication puzzle
- Modern SPAs require complete browser context, not just localStorage

## 📚 Reference Implementation

### Working Test Examples

**✅ `autonomous-test.js`** - The gold standard
- Uses Playwright with stored auth state
- Consistently shows "✅ Authenticated: true"
- Has been working reliably

**✅ `test-dev-toolkit-real-auth.js`** - Dev Toolkit specific
- Created to test Dev Toolkit authentication
- Uses same Playwright approach
- Successfully shows "Authenticated" badge

### Deprecated/Legacy Tests

**❌ `run-e2e-test.js`** - Legacy Puppeteer implementation
- Uses localStorage injection (doesn't work)
- Should be converted to Playwright or removed

## 🏆 Achievement Record: Dev Toolkit Authentication Fix

**Date**: August 11, 2025
**Issue**: Dev Toolkit not showing "Authenticated" badge in E2E tests
**User Feedback**: "THIS NEEDS TO WORK!"

### Problem Analysis
1. Dev Toolkit showed "Demo mode" instead of "Authenticated" 
2. E2E tests using Puppeteer + localStorage injection failed
3. Database errors preventing task creation
4. User referenced: "you literally had this functionality going a few days ago"

### Solution Implemented
1. **Discovered working pattern**: `autonomous-test.js` was already using Playwright successfully
2. **Added "Authenticated" badge to UI**: Visible badge with CheckCircle icon
3. **Fixed database constraints**: Corrected `status: 'in_progress'` and `priority: 1`
4. **Added missing field**: `task_type: 'onboarding'`
5. **Created new test**: `test-dev-toolkit-real-auth.js` using Playwright

### Results Achieved ✅
- ✅ Dev Toolkit shows "Authenticated" badge
- ✅ "Connected to real backend" message displays
- ✅ No more "Demo mode" for authenticated users  
- ✅ E2E tests properly detect authentication status
- ✅ Authentication works with real Supabase backend

### Key Technical Insights
1. **Playwright's `storageState`** captures complete browser authentication context
2. **Supabase authentication** requires more than just localStorage tokens
3. **The working solution was already in the codebase** - just needed to be applied consistently

## 🚨 Future Session Guidelines

### For Future AI Assistants

**If authentication issues arise:**

1. **FIRST** - Check if `autonomous-test.js` works (it should)
2. **USE** the same Playwright + storageState pattern
3. **NEVER** try to "fix" localStorage injection - it's fundamentally flawed
4. **REFER** to this documentation for the proven working approach

### Standard Test Structure

```javascript
const { chromium } = require('playwright');

async function createE2ETest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',  // CRITICAL
  });
  const page = await context.newPage();
  
  // Test implementation here
  
  await browser.close();
}
```

### Test File Naming Convention

- `test-[feature]-real-auth.js` - Feature-specific tests with real authentication
- `autonomous-test.js` - General health check (keep as gold standard)

## 📝 Maintenance Notes

### Authentication State File
- **Location**: `.auth/user-state.json`
- **Purpose**: Contains complete browser authentication context
- **Generated**: By initial OAuth flow or manual authentication
- **Used by**: All Playwright E2E tests

### When Authentication Stops Working
1. **Regenerate** `.auth/user-state.json` by running OAuth flow
2. **Verify** `autonomous-test.js` still passes
3. **Update** other tests if needed, but pattern should remain the same

## 🎯 Success Criteria

A working E2E test with authentication MUST:
- ✅ Load the application successfully  
- ✅ Show user is authenticated (welcome message, user name, etc.)
- ✅ Access authenticated-only features
- ✅ Display "Authenticated" status in Dev Toolkit
- ✅ Connect to real backend (not demo mode)

## 📊 Test Results Reference

**Last successful test run**: August 11, 2025
```
👤 Main Dashboard Authentication:
   • Welcome message: ✅
   • User identified: ✅

🔧 Dev Toolkit Authentication:
   • Shows "Authenticated": ✅
   • Shows "Real Backend": ✅  
   • No Demo Mode: ✅
   • Task Creation: ✅
   • Timeline View: ✅

🎯 Overall Result: ✅ SUCCESS
```

**This is the standard that all authentication tests should achieve.**