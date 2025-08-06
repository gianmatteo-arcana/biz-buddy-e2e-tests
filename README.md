# BizBuddy E2E Tests

End-to-end tests for BizBuddy with Google OAuth authentication support.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# First time setup (configure test credentials)
npm run setup

# Capture auth state (opens browser for Google login)
npm run auth:refresh

# Run tests
npm test
```

## 📚 Documentation

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Comprehensive guide for developers
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Common commands and quick fixes
- **[Signup Tests](SIGNUP_TESTS.md)** - Testing fresh user signup flows

## ✨ Key Features

- **Auto-detecting auth capture** - No manual "Press Enter" needed
- **Token management** - Track expiration and refresh easily  
- **Comprehensive tests** - Full authenticated user journey tests
- **Fresh signup tests** - Test complete OAuth flow without saved auth
- **Developer friendly** - Clear documentation and helpful error messages

## 🧪 Available Tests

### Authenticated Tests (use saved auth)
- `npm test` - Run all tests
- `npm run test:safe` - Check auth before running
- `npx playwright test tests/e2e/full-auth-flow.spec.ts` - Recommended test

### Fresh Signup Tests (no saved auth)
- `npm run test:manual-signup` - Interactive OAuth (recommended)
- `npm run test:oauth-flow` - Automated OAuth (requires credentials)

## 🔑 How Authentication Works

1. **Capture**: `npm run auth:refresh` opens browser, waits for login, auto-saves state
2. **Use**: Tests automatically load saved auth before each run
3. **Expire**: Tokens last ~1 hour
4. **Refresh**: When expired, run step 1 again

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Auth expired | `npm run auth:refresh` |
| Tests timeout | See [Developer Guide](docs/DEVELOPER_GUIDE.md#troubleshooting) |
| Can't automate OAuth | Use `npm run test:manual-signup` |

## 🏗️ Project Structure

```
├── .auth/                  # Auth state (gitignored)
├── docs/                   # Documentation
├── scripts/                # CI/CD helper scripts
├── tests/
│   ├── auth/              # Auth setup tests
│   └── e2e/               # E2E test specs
├── auth-manager.js         # Core auth management
└── playwright.config.ts    # Main config
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

ISC