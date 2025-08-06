# 🔄 Development-Test Cycle for Onboarding

This guide explains the virtuous develop-test-examine-improve cycle for working on the onboarding functionality.

## 🚀 Quick Start

```bash
# 1. Set up credentials (first time only, or when expired)
npm run setup:credentials

# 2. Run automated auth (captures auth state)
npm run auth:automated

# 3. Run onboarding tests
npm test tests/e2e/onboarding-flow.spec.ts
```

## 📋 The Complete Cycle

### 1️⃣ **Setup Phase** (One-time or when credentials expire)

```bash
# Set up test credentials
npm run setup:credentials
# Enter email: gianmatteo.allyn.test@gmail.com
# Enter password: ******** (hidden)
```

Credentials are encrypted and stored locally for 1 hour.

### 2️⃣ **Authentication Phase**

```bash
# Option A: Full automated flow (checks validity, refreshes if needed)
npm run auth

# Option B: Just capture auth
npm run auth:automated

# Option C: Check current auth validity
npm run auth:check
```

### 3️⃣ **Development Phase**

1. **Make Changes** in frontend code (`biz-buddy-ally-now/`)
2. **Commit & Push** to see changes in Lovable
3. **Wait ~30s** for Lovable to deploy

### 4️⃣ **Test Phase**

```bash
# Run specific onboarding tests
npm test tests/e2e/onboarding-flow.spec.ts

# Run all tests
npm test

# Run tests in UI mode (interactive)
npm run test:ui

# Debug mode (step through)
npm run test:debug
```

### 5️⃣ **Examine Phase**

```bash
# View test report
npm run test:report

# Check screenshots
ls test-results/
open test-results/*.png

# Monitor onboarding state
node test-onboarding-progressive.js
```

### 6️⃣ **Improve Phase**

Based on test results:
- Fix failing tests
- Improve UX based on screenshots
- Add missing functionality
- Update tests for new features

## 🔧 Test Instrumentation

The frontend now includes instrumentation that makes tests reliable:

```javascript
// Frontend tracks these states:
window.__appState = {
  initialized: boolean,    // App fully loaded
  authChecked: boolean,    // Auth state determined
  userLoaded: boolean,     // User profile loaded
  onboardingChecked: boolean, // Onboarding status checked
  error?: string          // Any initialization errors
}
```

Tests wait for actual app readiness instead of arbitrary timeouts:

```javascript
// In tests:
await waitForAppReady(page); // Waits for app to be ready
```

## 📝 Common Workflows

### Testing Onboarding for New User

```bash
# 1. Clear any existing data for test user
# (Currently manual - contact admin)

# 2. Run fresh signup test
npm test tests/e2e/onboarding-flow.spec.ts -- --grep "first time user"
```

### Testing Onboarding Resume

```bash
# Test partial completion scenarios
npm test tests/e2e/onboarding-flow.spec.ts -- --grep "partial completion"
```

### Quick Iteration Cycle

```bash
# Terminal 1: Watch frontend
cd ../biz-buddy-ally-now
npm run dev

# Terminal 2: Run tests on change
npm run test:watch tests/e2e/onboarding-flow.spec.ts
```

## 🛠️ Troubleshooting

### Auth Issues

```bash
# Check auth validity
npm run auth:check

# If expired or invalid
npm run setup:credentials  # Re-enter credentials
npm run auth:automated     # Capture fresh auth
```

### Test Failures

1. **Check Screenshots**: `test-results/` folder
2. **Check Auth**: Might have expired
3. **Check Console**: Browser console in headed mode
4. **Use Debug Mode**: `npm run test:debug`

### Slow Tests

- Instrumentation should make tests fast
- If slow, check if Lovable deployment is complete
- Use `--headed` to see what's happening

## 📊 Best Practices

1. **Always use test user**: `gianmatteo.allyn.test@gmail.com`
2. **Keep auth fresh**: Check before long test sessions
3. **Commit often**: Small changes are easier to test
4. **Screenshot on failure**: Tests auto-capture on failure
5. **Use instrumentation**: Wait for app states, not timeouts

## 🔍 Debugging Tools

```bash
# Interactive test UI
npm run test:ui

# Step-by-step debugging
npm run test:debug

# Monitor app state
node test-with-instrumentation.js

# Check onboarding progression
node test-onboarding-progressive.js
```

## 📈 Metrics to Track

- **Test execution time**: Should be <30s with instrumentation
- **Onboarding completion rate**: All steps should complete
- **State persistence**: Data should save between steps
- **Error handling**: Graceful failures with clear messages

## 🎯 Success Criteria

✅ All onboarding tests pass
✅ Onboarding flow matches PRD
✅ State persists correctly
✅ Good UX (no confusing states)
✅ Fast test execution (<30s)

---

## 💡 Pro Tips

1. **Parallel Development**: Keep test terminal open while coding
2. **Visual Regression**: Save screenshots for comparison
3. **Test Data**: Use consistent test business names
4. **Clean State**: Consider test data cleanup between runs
5. **CI/CD Ready**: Same commands work in CI pipeline

Remember: **Test early, test often!** The automated setup makes it easy to maintain quality while moving fast.