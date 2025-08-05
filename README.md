# BizBuddy E2E Tests

End-to-end tests for BizBuddy application using Playwright.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Access to BizBuddy staging/production environments

### Installation
```bash
npm install
npx playwright install
```

### First Time Setup (Google OAuth)
```bash
# Save authentication state (manual process - one time only)
npm run test:auth

# This will:
# 1. Open a browser
# 2. Navigate to BizBuddy
# 3. Wait for you to sign in with Google
# 4. Save the auth state for future test runs
```

### Running Tests
```bash
# Run all tests
npm test

# Run with UI mode (recommended for debugging)
npm run test:ui

# Run specific test suite
npm run test:signup
npm run test:visual

# Run against different environments
npm run test:staging
npm run test:production
```

## 📁 Project Structure

```
tests/
├── auth/
│   └── auth.setup.ts      # Google OAuth state saver
├── e2e/
│   ├── signup-flow.spec.ts # User signup/onboarding tests
│   └── dashboard.spec.ts   # Dashboard functionality tests
├── visual/
│   └── visual.spec.ts      # Visual regression tests
└── utils/
    ├── helpers.ts          # Common test utilities
    └── selectors.ts        # UI element selectors
```

## 🔐 Authentication

We use Playwright's auth state persistence to handle Google OAuth:

1. **Initial Setup**: Run `npm run test:auth` and manually sign in
2. **State Storage**: Auth cookies/tokens saved to `.auth/user-state.json`
3. **Test Execution**: All tests reuse the saved auth state
4. **Refresh**: Re-run auth setup when tokens expire (typically monthly)

## 🌍 Environments

Configure test environment via `ENVIRONMENT` variable:

- `staging` (default): Lovable preview URL
- `production`: Production application
- `local`: Local development (http://localhost:5173)

## 🚢 Deployment

This test suite is deployed to Railway as a standalone service.

### Railway Configuration
- Service runs as cron job (daily at 2 AM)
- Test results stored in Railway volumes
- Can be triggered manually via Railway dashboard

### CI/CD Integration
Tests can be triggered from GitHub Actions in the main repos.

## 📊 Test Reports

- **HTML Report**: `npm run test:report`
- **JSON Results**: `test-results/results.json`
- **Screenshots**: `test-results/` (on failure)
- **Videos**: `test-results/` (on failure)

## 🛠️ Troubleshooting

### Auth State Expired
```bash
rm -rf .auth/
npm run test:auth
```

### Tests Failing on CI
- Check if auth state needs refresh
- Verify environment URLs are accessible
- Review screenshot/video artifacts

### Flaky Tests
- Increase timeouts in playwright.config.ts
- Add explicit waits for dynamic content
- Use more specific selectors

## 📝 Writing Tests

### Best Practices
1. Use data-testid attributes for reliable selectors
2. Avoid hard-coded waits - use Playwright's auto-waiting
3. Write independent tests that don't rely on order
4. Clean up test data after each test
5. Use descriptive test names

### Example Test
```typescript
test('user can complete onboarding', async ({ page }) => {
  await page.goto('/');
  
  // Assert onboarding card is visible
  await expect(page.getByText('Welcome to BizBuddy!')).toBeVisible();
  
  // Fill business details
  await page.fill('[data-testid="business-name"]', 'Test Company');
  await page.click('[data-testid="continue-button"]');
  
  // Verify completion
  await expect(page).toHaveURL('/dashboard');
});