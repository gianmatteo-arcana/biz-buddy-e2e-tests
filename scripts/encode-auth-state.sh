#!/bin/bash

# Script to encode auth state for use in CI/CD environments

AUTH_FILE=".auth/user-state.json"

if [ ! -f "$AUTH_FILE" ]; then
  echo "❌ Auth file not found: $AUTH_FILE"
  echo "   Run 'npm run auth:refresh' first"
  exit 1
fi

echo "📋 Encoding auth state for CI/CD..."
echo ""
echo "Copy this value to your CI/CD environment as BIZBUDDY_AUTH_STATE:"
echo "================================================"
base64 -i "$AUTH_FILE"
echo "================================================"
echo ""
echo "✅ Done! Set this as an environment variable in Railway"