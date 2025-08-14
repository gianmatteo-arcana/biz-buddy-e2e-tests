# E2E Testing Standards - Claude Code Guidelines

## 🚨 CRITICAL: PULL REQUEST WORKFLOW MANDATORY

### **NO DIRECT PUSHES TO MAIN BRANCH**

**YOU ARE FORBIDDEN FROM:**
- ❌ `git push origin main`
- ❌ Merging without human approval
- ❌ Bypassing PR review process

**YOU MUST ALWAYS:**
- ✅ Create feature branches for ALL test updates
- ✅ Push to feature branches only
- ✅ Create Pull Requests for review
- ✅ Wait for human approval before merge

## 🔴 MANDATORY: PLAYWRIGHT TESTING STANDARDS FOR REACT

**CRITICAL: All E2E tests MUST follow the Playwright Testing Standards documented in `PLAYWRIGHT_TESTING_STANDARDS.md`**

### Core Principles - NO EXCEPTIONS:
1. **NO arbitrary timeouts** - Use `data-testid` and `data-loaded` attributes
2. **Explicit over implicit** - App signals when ready, tests don't guess
3. **Test-specific attributes** - Use `data-testid` for selectors, never CSS classes
4. **Deterministic waits** - Wait for `data-loaded="true"` not `waitForTimeout()`
5. **Screenshot validation** - Capture and analyze screenshots for UI verification
6. **Multi-repo coordination** - E2E tests must work with ALL repo versions

### Required Test Pattern:
```javascript
// ✅ CORRECT - Deterministic wait
await page.waitForSelector('[data-testid="user-list"][data-loaded="true"]');

// ❌ WRONG - Arbitrary timeout
await page.waitForTimeout(3000);
```

See `PLAYWRIGHT_TESTING_STANDARDS.md` for complete implementation guide.

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
6. **VERIFY** tests pass with both frontend and backend running
7. **CREATE PR** for review - never push directly to main

**NEVER create standalone E2E tests outside this framework!**

### Test Output Location
**ALL test results, screenshots, and logs MUST be stored in:**
```
/Users/gianmatteo/Documents/Arcana-Prototype/tests/
```
**NEVER commit test artifacts to git!**

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

## 🔧 ARCHITECTURAL PRINCIPLES FROM PR REVIEWS

### From Backend/Frontend Integration:
1. **TYPE SYNCHRONIZATION** - Keep frontend and backend types aligned
2. **NO PREMATURE ABSTRACTION** - Don't create "universal" test patterns too early
3. **CLEAR ERROR MESSAGES** - Test failures should explain what went wrong
4. **MULTI-REPO AWARENESS** - Tests must handle schema/API changes gracefully

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

---

# Repository-Based Screenshot Solution

## Operational Screenshot System

**Date**: August 14, 2025  
**Status**: Working repository-based screenshot system for E2E testing  

### 🚀 **The Working Solution**

After extensive development and testing, we achieved the **repository approach with auto-prune of 10 days, in the e2e repo only** - exactly as requested.

#### ✅ **Core Components (All Working):**

1. **Repository Storage**
   - Screenshots stored in `biz-buddy-e2e-tests` repository only
   - Clean timestamped directory structure: `uploaded-screenshots/issue-{number}/{timestamp}/`
   - Uses GitHub Contents API for reliable uploads

2. **10-Day Auto-Cleanup**
   - Automated daily cron job at 2 AM UTC
   - Uses git commit history to determine file age
   - Automatically removes screenshots older than 10 days
   - ✅ **Tested and verified working**

3. **Immediate Visual Access**
   - Repository made public for raw URL accessibility
   - Screenshots display instantly in GitHub issues
   - No external dependencies or broken links

### 🔧 **Operational Workflows**

#### **Upload Screenshots Workflow**
- **File**: `.github/workflows/upload-test-artifacts.yml`
- **Trigger**: Manual dispatch with issue number and test name
- **Function**: Uploads screenshots and posts to GitHub issues with embedded images

```bash
# Usage:
gh workflow run "Upload Test Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f issue_number=19 \
  -f test_name="E2E Test Results"
```

#### **Auto-Cleanup Workflow**  
- **File**: `.github/workflows/auto-cleanup-screenshots.yml`
- **Trigger**: Daily at 2 AM UTC (automatic)
- **Function**: Removes screenshots older than 10 days to prevent repository bloat

### 📸 **Live Example**
**Working screenshots visible at**: https://github.com/gianmatteo-arcana/biz-buddy-ally-now/issues/19#issuecomment-3186959805

### 🎯 **When to Use This System**

**MANDATORY for all E2E issue updates involving:**
- Bug fixes requiring visual proof
- Feature implementations needing demonstration
- Test results that require screenshot evidence
- Migration fixes or UI changes

### 🔄 **Standard Operational Procedure**

1. **Run E2E Tests** with screenshot capture
2. **Trigger Upload Workflow** with issue number
3. **Verify Screenshots** appear in GitHub issue
4. **Auto-cleanup** handles maintenance automatically

### 🏆 **Key Technical Insights**

- **GitHub Repository Visibility**: Must be public for raw URL access
- **File Size Management**: Works reliably with typical E2E screenshot sizes (50-60KB)
- **Contents API**: More reliable than git commits for file uploads
- **Raw URLs**: `https://raw.githubusercontent.com/{owner}/{repo}/main/{path}` format

### 🚨 **Critical Success Factors**
1. Repository must be **public** for screenshot accessibility
2. Use **timestamped directories** to prevent file conflicts
3. **Auto-cleanup is essential** to prevent repository bloat
4. **Test framework integration** ensures consistent usage

---

## 📋 **For Future AI Assistants**

**When E2E issues require screenshot evidence:**

1. ✅ **USE** the upload workflow: `Upload Test Screenshots`
2. ✅ **REFERENCE** this implementation as the proven working approach
3. ✅ **INCLUDE** issue number and descriptive test name
4. ✅ **VERIFY** screenshots display properly in the target issue

**This system is PROVEN WORKING and should be the standard for all E2E visual documentation.**