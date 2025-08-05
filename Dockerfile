# Use official Playwright image
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all test files
COPY . .

# Install Playwright browsers
RUN npx playwright install chromium firefox

# Create directories for test results
RUN mkdir -p test-results playwright-report .auth

# Set environment variables
ENV CI=true
ENV NODE_ENV=test

# Default command runs all tests
CMD ["npm", "test"]