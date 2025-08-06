# Fresh Signup Tests

These tests validate the complete Google OAuth signup flow without using saved authentication state.

## Available Tests

### 1. Manual Signup Test (Recommended)
```bash
npm run test:manual-signup
```
- Opens browser in non-headless mode
- Waits for you to manually complete Google OAuth
- Automatically detects when you reach the dashboard
- 5-minute timeout

### 2. Automated OAuth Flow
```bash
# Set credentials first
export TEST_GOOGLE_EMAIL="your-test@gmail.com"
export TEST_GOOGLE_PASSWORD="your-password"

npm run test:oauth-flow
```
- Attempts to automate the Google login
- Requires test credentials
- May fail if Google shows captcha or 2FA

### 3. Fresh Signup Flow Test
```bash
npm run test:fresh-signup
```
- Basic test structure for signup flow
- Requires credentials to be set

## How Manual Test Works

1. **Launch**: Opens browser at BizBuddy sign-in page
2. **Wait**: You manually click "Sign in with Google" and complete OAuth
3. **Detect**: Test automatically detects when you're back on dashboard
4. **Verify**: Confirms authentication was successful

## Why Manual Test?

Google OAuth has several security features that make automation difficult:
- Captchas
- 2FA/MFA requirements  
- Device verification
- Unusual activity detection

The manual test lets you handle these interactively while still validating the end result.

## Test Output

Successful run shows:
```
✅ Sign in page loaded

============================================================
👉 Please complete the Google OAuth flow in the browser
============================================================

⏳ Waiting for authentication... 45s

✅ Authentication successful! Found: text=Chat with Ally

📧 Authenticated as: your-email@gmail.com
🎉 Manual signup test completed successfully!
```

## Screenshots

Tests save screenshots to:
- `test-results/manual-signup-success.png` - Dashboard after signup
- `test-results/oauth-flow-complete.png` - Automated flow result
- `test-results/google-login-page.png` - Google OAuth page