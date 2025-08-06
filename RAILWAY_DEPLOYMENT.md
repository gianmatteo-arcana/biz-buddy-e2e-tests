# Railway Deployment Guide

## Overview

This guide explains how to deploy the BizBuddy E2E tests to Railway with authentication state.

## Prerequisites

1. Local auth state captured: `npm run auth:refresh`
2. Railway CLI installed (optional)
3. GitHub repository set up

## Deployment Steps

### 1. Encode Auth State

First, encode your local auth state for Railway:

```bash
npm run auth:encode
```

This will output a base64-encoded string. Copy this entire string.

### 2. Set up Railway Project

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Connect your GitHub repository

### 3. Configure Environment Variables

In Railway dashboard:
1. Go to your service settings
2. Add environment variable:
   - Key: `BIZBUDDY_AUTH_STATE`
   - Value: [paste the base64 string from step 1]

### 4. Deploy

Railway will automatically:
1. Install dependencies
2. Install Playwright browsers
3. Prepare auth state from env var
4. Run tests

## How It Works

1. **Build Phase**:
   - Installs npm dependencies
   - Installs Chromium for Playwright

2. **Deploy Phase**:
   - Runs `npm run ci:test`
   - This triggers `ci:prepare` which:
     - Detects Railway environment
     - Reads `BIZBUDDY_AUTH_STATE` env var
     - Decodes and writes to `.auth/user-state.json`
   - Then runs the tests with saved auth

## Updating Auth State

When auth expires (after ~1 hour):

1. Locally: `npm run auth:refresh`
2. Encode new state: `npm run auth:encode`
3. Update Railway env var with new value
4. Redeploy

## Environment Variables

- `BIZBUDDY_AUTH_STATE`: Base64-encoded auth state (required)
- `CI`: Set automatically by Railway
- `RAILWAY_ENVIRONMENT`: Set automatically by Railway

## Monitoring

- Check Railway logs for test results
- Tests run once per deployment
- Service stops after tests complete (restartPolicy: never)

## Security Notes

- Auth state contains sensitive cookies/tokens
- Keep `BIZBUDDY_AUTH_STATE` secret
- Rotate auth state regularly
- Don't commit auth state to git (.gitignore handles this)