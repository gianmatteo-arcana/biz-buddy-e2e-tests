# Authentication Guide for E2E Tests

## Overview

The E2E tests require valid Google OAuth authentication to access BizBuddy. The authentication tokens expire after 1 hour, requiring periodic re-authentication.

## Developer-Friendly Workflow

### 1. Check Authentication Status

```bash
npm run auth:check
```

This shows:
- Whether auth is valid
- How many minutes remain before expiration
- Exact expiration time

### 2. Refresh Authentication (When Needed)

When auth expires or is invalid:

```bash
npm run auth:refresh
```

This will:
1. Open a browser window
2. Navigate to BizBuddy
3. Wait for you to sign in with Google
4. **Automatically detect** when you're authenticated
5. Save the auth state
6. Close the browser

**Key Features:**
- No need to switch terminals or press Enter
- Automatic detection of successful login
- Shows remaining validity time after capture

### 3. Run Tests with Auto-Check

```bash
npm run test:safe
# or for specific tests:
npm run test:simple
```

This will:
1. Check if auth is valid
2. If invalid, tell you to run `npm run auth:refresh`
3. If valid, run the tests

## How It Works

### Token Lifetimes

- **Supabase Access Token**: 1 hour
- **Google OAuth Access Token**: ~1 hour  
- **Google Refresh Token**: Long-lived (used to get new access tokens)
- **Google Session Cookies**: Days to months

### Auth State Storage

The auth state is saved in `.auth/user-state.json` containing:
- HTTP cookies (including Google session cookies)
- localStorage data (including Supabase auth token)

### Automatic Detection

The auth manager detects successful authentication by looking for:
- "Welcome back" message
- "Chat with Ally" button
- User name in header
- Dashboard URL

## Troubleshooting

### "Auth is invalid" even after signing in

The auth capture might have failed. Check:
1. Did the browser close automatically after sign-in?
2. Check `.auth/last-auth-success.json` for capture timestamp
3. Try `npm run auth:refresh` again

### Tests fail with loading spinner

This usually means the auth token is expired. Run:
```bash
npm run auth:check  # Verify it's expired
npm run auth:refresh  # Get new auth
```

### Manual Testing

To manually verify auth is working:
```bash
node verify-auth.js
```

This opens a browser with your saved auth state for 30 seconds.

## Best Practices

1. **Check before long test runs**: Run `npm run auth:check` to see how much time you have
2. **Refresh proactively**: If you have <10 minutes left, refresh before starting tests
3. **Use test:safe commands**: These check auth validity before running tests
4. **Watch for the lock file**: If `.auth/auth-in-progress.lock` exists, another auth capture is running

## Implementation Details

The system uses:
- `AuthManager` class to handle auth validation and capture
- Playwright's `storageState` to save/load browser state
- Automatic polling to detect successful authentication
- Lock files to prevent concurrent auth captures