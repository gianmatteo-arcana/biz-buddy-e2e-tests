/**
 * Performance Guard for E2E Tests
 * 
 * ENFORCES non-blocking UI patterns by failing tests that:
 * 1. Take too long to show first content (>1 second)
 * 2. Have blocking API calls (>3 seconds)
 * 3. Show blank screens while loading
 * 4. Don't provide loading states
 */

const { chromium } = require('playwright');

class PerformanceGuard {
  constructor(options = {}) {
    this.limits = {
      firstContentfulPaint: options.firstContentfulPaint || 1000,  // 1 second max
      interactive: options.interactive || 2000,                     // 2 seconds max
      apiTimeout: options.apiTimeout || 3000,                      // 3 seconds max
      totalLoadTime: options.totalLoadTime || 5000                 // 5 seconds max
    };
    
    this.violations = [];
    this.metrics = {};
  }

  async testPage(url, options = {}) {
    const browser = await chromium.launch({ 
      headless: options.headless !== false 
    });
    
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Set up performance monitoring
      await this.setupMonitoring(page);
      
      // Navigate and measure
      const startTime = Date.now();
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', // Don't wait for everything
        timeout: this.limits.totalLoadTime 
      });
      
      // Check for immediate content
      await this.checkFirstContent(page, startTime);
      
      // Monitor API calls
      await this.monitorAPICalls(page);
      
      // Check for blocking patterns
      await this.checkBlockingPatterns(page);
      
      // Validate loading states
      await this.validateLoadingStates(page);
      
      // Get performance metrics
      await this.collectMetrics(page);
      
      // Generate report
      return this.generateReport();
      
    } finally {
      await browser.close();
    }
  }

  async setupMonitoring(page) {
    // Intercept all network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('supabase')) {
        this.trackAPICall(url, Date.now());
      }
    });
    
    page.on('response', response => {
      const url = response.url();
      if (this.apiCalls?.[url]) {
        const duration = Date.now() - this.apiCalls[url].startTime;
        this.apiCalls[url].duration = duration;
        
        // Flag violations
        if (duration > this.limits.apiTimeout) {
          this.violations.push({
            type: 'BLOCKING_API',
            url,
            duration,
            limit: this.limits.apiTimeout,
            severity: 'CRITICAL'
          });
        }
      }
    });
    
    // Monitor console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('timeout') || text.includes('Timeout')) {
          this.violations.push({
            type: 'TIMEOUT_ERROR',
            message: text,
            severity: 'HIGH'
          });
        }
      }
    });
    
    this.apiCalls = {};
  }

  trackAPICall(url, startTime) {
    this.apiCalls[url] = { startTime };
  }

  async checkFirstContent(page, startTime) {
    // Check if anything is visible within 1 second
    try {
      await page.waitForSelector('body *:visible', {
        timeout: this.limits.firstContentfulPaint
      });
      
      const firstContentTime = Date.now() - startTime;
      this.metrics.firstContent = firstContentTime;
      
      // Check if it's just a loading spinner or real content
      const bodyText = await page.textContent('body');
      if (bodyText.trim() === '' || bodyText === 'Loading...') {
        this.violations.push({
          type: 'NO_CONTENT',
          message: 'Page shows no meaningful content within 1 second',
          duration: firstContentTime,
          severity: 'CRITICAL'
        });
      }
    } catch (error) {
      this.violations.push({
        type: 'SLOW_FIRST_PAINT',
        message: `First content took longer than ${this.limits.firstContentfulPaint}ms`,
        severity: 'CRITICAL'
      });
    }
  }

  async monitorAPICalls(page) {
    // Wait a bit to catch initial API calls
    await page.waitForTimeout(500);
    
    // Check for blocking patterns
    const hasBlockingCalls = await page.evaluate(() => {
      // Check if any code is using synchronous XMLHttpRequest (deprecated but still possible)
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent?.includes('async: false')) {
          return true;
        }
      }
      return false;
    });
    
    if (hasBlockingCalls) {
      this.violations.push({
        type: 'SYNC_API_CALL',
        message: 'Found synchronous API calls that block the UI',
        severity: 'CRITICAL'
      });
    }
  }

  async checkBlockingPatterns(page) {
    // Check if page is waiting for data before rendering
    const patterns = await page.evaluate(() => {
      const issues = [];
      
      // Check for loading states
      const hasLoadingState = document.body.textContent?.includes('Loading') ||
                            document.querySelector('.spinner, .loader, [class*="loading"]');
      
      // Check if main content area is empty
      const mainContent = document.querySelector('main, #root, .app');
      if (mainContent && mainContent.children.length === 0) {
        issues.push('EMPTY_CONTENT');
      }
      
      // Check for error messages about backend
      if (document.body.textContent?.includes('Backend unavailable') ||
          document.body.textContent?.includes('Failed to fetch')) {
        issues.push('BACKEND_DEPENDENCY');
      }
      
      return { hasLoadingState, issues };
    });
    
    if (patterns.issues.includes('EMPTY_CONTENT') && !patterns.hasLoadingState) {
      this.violations.push({
        type: 'NO_LOADING_STATE',
        message: 'Page is empty but shows no loading indicator',
        severity: 'HIGH'
      });
    }
    
    if (patterns.issues.includes('BACKEND_DEPENDENCY')) {
      this.violations.push({
        type: 'BACKEND_BLOCKING',
        message: 'UI depends on backend availability for initial render',
        severity: 'CRITICAL'
      });
    }
  }

  async validateLoadingStates(page) {
    // Check progressive loading
    const loadingStages = await page.evaluate(() => {
      const stages = [];
      
      // Stage 1: Initial render (should be immediate)
      if (document.body.children.length > 0) {
        stages.push('initial_render');
      }
      
      // Stage 2: Interactive elements
      if (document.querySelector('button, a, input')) {
        stages.push('interactive');
      }
      
      // Stage 3: Data loaded
      if (document.querySelector('[data-loaded="true"]')) {
        stages.push('data_loaded');
      }
      
      return stages;
    });
    
    if (!loadingStages.includes('initial_render')) {
      this.violations.push({
        type: 'NO_INITIAL_RENDER',
        message: 'Page does not render anything initially',
        severity: 'CRITICAL'
      });
    }
    
    if (!loadingStages.includes('interactive')) {
      this.violations.push({
        type: 'NOT_INTERACTIVE',
        message: 'Page has no interactive elements within timeout',
        severity: 'HIGH'
      });
    }
  }

  async collectMetrics(page) {
    // Collect Web Vitals
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        domInteractive: perf.domInteractive - perf.fetchStart,
        responseTime: perf.responseEnd - perf.requestStart
      };
    });
    
    this.metrics = { ...this.metrics, ...metrics };
    
    // Check against limits
    if (metrics.domInteractive > this.limits.interactive) {
      this.violations.push({
        type: 'SLOW_INTERACTIVE',
        message: `Page took ${metrics.domInteractive}ms to become interactive (limit: ${this.limits.interactive}ms)`,
        duration: metrics.domInteractive,
        severity: 'HIGH'
      });
    }
  }

  generateReport() {
    const hasCritical = this.violations.some(v => v.severity === 'CRITICAL');
    const passed = this.violations.length === 0;
    
    return {
      passed,
      failed: !passed,
      critical: hasCritical,
      violations: this.violations,
      metrics: this.metrics,
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    if (this.violations.length === 0) {
      return '✅ All performance checks passed! App loads without blocking.';
    }
    
    const critical = this.violations.filter(v => v.severity === 'CRITICAL');
    const high = this.violations.filter(v => v.severity === 'HIGH');
    
    let summary = '❌ Performance violations detected:\n';
    
    if (critical.length > 0) {
      summary += `\n🚫 CRITICAL (blocks users):\n`;
      critical.forEach(v => {
        summary += `   - ${v.type}: ${v.message}\n`;
      });
    }
    
    if (high.length > 0) {
      summary += `\n⚠️  HIGH (poor experience):\n`;
      high.forEach(v => {
        summary += `   - ${v.type}: ${v.message}\n`;
      });
    }
    
    summary += '\n📊 Metrics:\n';
    Object.entries(this.metrics).forEach(([key, value]) => {
      summary += `   - ${key}: ${value}ms\n`;
    });
    
    return summary;
  }
}

// Export for use in tests
module.exports = { PerformanceGuard };

// Run standalone if called directly
if (require.main === module) {
  const guard = new PerformanceGuard();
  const url = process.argv[2] || 'http://localhost:8081';
  
  console.log(`🔍 Testing performance of ${url}...\n`);
  
  guard.testPage(url).then(report => {
    console.log(report.summary);
    
    if (report.failed) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}