# BizBuddy E2E Tests

End-to-end tests for BizBuddy with Google OAuth authentication support.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Capture auth state (opens browser for Google login)
npm run auth:refresh

# Check auth validity
npm run auth:check

# Run tests
npx playwright test tests/e2e/full-auth-flow.spec.ts --config playwright.config.simple.ts
```

## ✨ Features

- **Auto-detecting auth capture** - No manual "Press Enter" needed
- **Token management** - Track expiration and refresh easily
- **Comprehensive tests** - Full authenticated user journey tests
- **CI/CD ready** - Scripts for Railway deployment (future work)

## 📖 How It Works

1. **Auth Capture**: The `AuthManager` opens a browser, waits for you to sign in with Google, and automatically detects when authentication is complete
2. **State Persistence**: Auth state (cookies + localStorage) is saved to `.auth/user-state.json`
3. **Test Execution**: Playwright loads the saved auth state before each test, allowing tests to run as an authenticated user

## 🔑 Authentication

### Capture New Auth
```bash
npm run auth:refresh
```
This will:
- Open a browser window
- Navigate to BizBuddy
- Wait for you to sign in
- Auto-detect successful authentication
- Save the complete auth state

### Check Auth Status
```bash
npm run auth:check
```
Output:
```json
{
  "valid": true,
  "expiresAt": "8/5/2025, 6:10:34 PM",
  "minutesLeft": 45
}
```

## 🧪 Running Tests

### Recommended Test
```bash
npx playwright test tests/e2e/full-auth-flow.spec.ts --config playwright.config.simple.ts
```

### All Tests
```bash
npm test
```

### With Auth Check
```bash
npm run test:safe
```

## 📁 Project Structure

```
├── .auth/                  # Auth state (gitignored)
├── scripts/               # CI/CD helper scripts
├── tests/
│   ├── auth/             # Auth setup tests
│   └── e2e/              # E2E test specs
├── auth-manager.js        # Core auth management
├── playwright.config.ts   # Main config
└── test-with-auth.js     # Safe test runner
```

## ⏱️ Token Expiration

- **Supabase tokens**: Valid for ~1 hour
- **Google OAuth**: ~1 hour
- **Google session cookies**: Can last days/months

When tokens expire, simply run `npm run auth:refresh` again.

## 🚧 Future Work

- Railway deployment automation
- Scheduled test runs
- Multi-environment support
- Visual regression tests

## 📝 Notes

- Some tests may show timing issues (loading spinner) - use the `full-auth-flow.spec.ts` test which is more resilient
- Auth state contains sensitive data and is gitignored
- The debug test (`test-debug.spec.ts`) provides detailed console logging if troubleshooting is needed