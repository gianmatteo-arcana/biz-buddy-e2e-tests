# Test Credentials Setup

## Test Account

For E2E testing, we use a dedicated Google account:
- **Email**: `gianmatteo.allyn.test@gmail.com`
- **Password**: Stored in `.env` file (never commit!)

## Setup Instructions

### 1. Automatic Setup (Recommended)
```bash
npm run setup
```
This will:
- Create `.env` file from template
- Prompt for the test account password
- Configure environment variables

### 2. Manual Setup
```bash
# Copy example file
cp .env.example .env

# Edit .env and add password
nano .env
```

## Security Guidelines

✅ **DO:**
- Keep password in `.env` file only
- Use this account only for testing
- Rotate password periodically
- Use 2FA if possible

❌ **DON'T:**
- Commit `.env` file
- Share password in code/docs
- Use personal account
- Store in plain text files

## Using Test Credentials

### In Automated Tests
```typescript
// Credentials are loaded from environment
const email = process.env.TEST_GOOGLE_EMAIL;
const password = process.env.TEST_GOOGLE_PASSWORD;
```

### For Manual Testing
```bash
# Run interactive test
npm run test:manual-signup
```

## Troubleshooting

### "Password not set" error
```bash
# Check if .env exists
ls -la .env

# Re-run setup
npm run setup
```

### Google security challenges
- Use `npm run test:manual-signup` for interactive login
- Complete any 2FA/captcha manually
- Consider using app-specific password

## Future Improvements

1. **Multiple Test Accounts**: For parallel testing
2. **Account Rotation**: Automated cleanup between tests
3. **Service Account**: For fully automated testing (no 2FA)