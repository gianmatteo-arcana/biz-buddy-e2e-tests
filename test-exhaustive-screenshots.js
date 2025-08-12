#!/usr/bin/env node

/**
 * EXHAUSTIVE SCREENSHOT TEST
 * Captures EVERY possible screen, state, and element
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const TEST_URL = 'http://localhost:8080';
const OUTPUT_DIR = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/exhaustive-screenshots-${Date.now()}`;

class ExhaustiveScreenshotTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotCount = 0;
    this.screenshots = [];
  }

  async setup() {
    console.log('📸 EXHAUSTIVE SCREENSHOT CAPTURE');
    console.log('=' .repeat(60));
    console.log(`📁 Output: ${OUTPUT_DIR}`);
    console.log('=' .repeat(60) + '\n');
    
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Suppress console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('X-Frame-Options')) {
        console.log(`  ⚠️ ${msg.text().substring(0, 50)}...`);
      }
    });
  }

  async capture(name, description) {
    this.screenshotCount++;
    const filename = `${String(this.screenshotCount).padStart(3, '0')}-${name}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    await this.page.screenshot({
      path: filepath,
      fullPage: true
    });
    
    console.log(`📸 ${this.screenshotCount}. ${description}`);
    
    this.screenshots.push({
      number: this.screenshotCount,
      name,
      description,
      filename
    });
    
    // Also capture viewport-only version for detail
    if (this.screenshotCount % 5 === 0) {
      await this.page.screenshot({
        path: path.join(OUTPUT_DIR, `${String(this.screenshotCount).padStart(3, '0')}-${name}-viewport.png`),
        fullPage: false
      });
    }
  }

  async captureOnboarding() {
    console.log('\n🚀 ONBOARDING FLOW (COMPLETE)');
    console.log('-' .repeat(40));
    
    await this.page.goto(TEST_URL, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // 1. Welcome Screen
    await this.capture('onboarding-01-welcome', 'Welcome to SmallBizAlly screen');
    
    // Check Dev Toolkit visibility
    const devToolkitVisible = await this.page.$('text="Dev Toolkit - Agent Activity"');
    if (devToolkitVisible) {
      await this.capture('onboarding-02-welcome-with-devtoolkit', 'Welcome screen with Dev Toolkit open');
    }
    
    // 2. Click Get Started
    const getStarted = await this.page.$('[data-testid="get-started"]');
    if (getStarted) {
      // Hover state
      await getStarted.hover();
      await this.capture('onboarding-03-get-started-hover', 'Get Started button hover state');
      
      await getStarted.click();
      
      // Capture transition states
      await new Promise(r => setTimeout(r, 500));
      await this.capture('onboarding-04-transition-1', 'Transition after clicking Get Started');
      
      await new Promise(r => setTimeout(r, 1000));
      await this.capture('onboarding-05-transition-2', 'Business discovery loading');
      
      await new Promise(r => setTimeout(r, 4000));
      await this.capture('onboarding-06-business-found', 'Business found - Arcana Dwell LLC');
      
      // 3. Check agent logs in Dev Toolkit
      const logs = await this.page.$$('.border-l-4.border-l-purple-500');
      if (logs.length > 0) {
        await this.capture('onboarding-07-agent-logs', `Dev Toolkit showing ${logs.length} agent activities`);
        
        // Expand first log if possible
        const viewDataButton = await this.page.$('text="View data"');
        if (viewDataButton) {
          await viewDataButton.click();
          await new Promise(r => setTimeout(r, 500));
          await this.capture('onboarding-08-expanded-log', 'Agent log with expanded data');
        }
      }
      
      // 4. Select business
      const businessCard = await this.page.$('.cursor-pointer');
      if (businessCard) {
        await businessCard.hover();
        await this.capture('onboarding-09-business-hover', 'Business card hover state');
        
        await businessCard.click();
        await new Promise(r => setTimeout(r, 1000));
        await this.capture('onboarding-10-profile-loading', 'Profile collection loading');
        
        await new Promise(r => setTimeout(r, 2000));
        await this.capture('onboarding-11-profile-complete', 'Profile with Arcana Dwell data');
        
        // 5. Wait for compliance
        await new Promise(r => setTimeout(r, 4000));
        await this.capture('onboarding-12-compliance', 'Compliance requirements');
        
        // 6. Wait for optimization
        await new Promise(r => setTimeout(r, 3000));
        await this.capture('onboarding-13-optimization', 'UX optimization');
        
        // 7. Wait for celebration
        await new Promise(r => setTimeout(r, 3000));
        await this.capture('onboarding-14-celebration', 'Celebration with confetti');
      }
    }
  }

  async captureDevToolkit() {
    console.log('\n🛠️ DEV TOOLKIT (ALL STATES)');
    console.log('-' .repeat(40));
    
    // Close and reopen Dev Toolkit
    const closeButton = await this.page.$('[aria-label="Close"]');
    if (closeButton) {
      await closeButton.click();
      await new Promise(r => setTimeout(r, 500));
      await this.capture('devtoolkit-01-closed', 'Dev Toolkit closed (button visible)');
    }
    
    // Reopen
    const devButton = await this.page.$('[data-testid="dev-toolkit"]');
    if (devButton) {
      await devButton.hover();
      await this.capture('devtoolkit-02-button-hover', 'Dev Toolkit button hover state');
      
      await devButton.click();
      await new Promise(r => setTimeout(r, 500));
      await this.capture('devtoolkit-03-opening', 'Dev Toolkit opening animation');
      
      await new Promise(r => setTimeout(r, 500));
      await this.capture('devtoolkit-04-open', 'Dev Toolkit fully open');
    }
    
    // Scroll through logs
    const scrollArea = await this.page.$('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight / 2);
      await this.capture('devtoolkit-05-scrolled', 'Dev Toolkit scrolled to middle');
      
      await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
      await this.capture('devtoolkit-06-scrolled-bottom', 'Dev Toolkit scrolled to bottom');
    }
  }

  async captureDashboard() {
    console.log('\n📊 DASHBOARD (ALL VIEWS)');
    console.log('-' .repeat(40));
    
    // Navigate to root to reset
    await this.page.goto(TEST_URL, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    await this.capture('dashboard-01-main', 'Main dashboard view');
    
    // Look for navigation elements
    const navItems = ['Tasks', 'Timeline', 'Profile', 'Settings', 'Help'];
    for (let i = 0; i < navItems.length; i++) {
      const nav = navItems[i];
      const navButton = await this.page.$(`text="${nav}"`);
      if (navButton) {
        await navButton.hover();
        await this.capture(`dashboard-0${i + 2}-${nav.toLowerCase()}-hover`, `${nav} navigation hover`);
        
        await navButton.click();
        await new Promise(r => setTimeout(r, 1000));
        await this.capture(`dashboard-0${i + 2}-${nav.toLowerCase()}`, `${nav} view`);
      }
    }
  }

  async captureResponsive() {
    console.log('\n📱 RESPONSIVE VIEWS');
    console.log('-' .repeat(40));
    
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-full' },
      { width: 1440, height: 900, name: 'desktop-laptop' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 414, height: 896, name: 'mobile-iphone' },
      { width: 375, height: 667, name: 'mobile-small' }
    ];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await new Promise(r => setTimeout(r, 500));
      await this.capture(`responsive-${viewport.name}`, `${viewport.name} (${viewport.width}x${viewport.height})`);
    }
    
    // Reset to desktop
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  async captureInteractions() {
    console.log('\n🖱️ INTERACTIONS & STATES');
    console.log('-' .repeat(40));
    
    // Capture all buttons
    const buttons = await this.page.$$('button');
    console.log(`  Found ${buttons.length} buttons`);
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const button = buttons[i];
      const text = await button.evaluate(el => el.textContent);
      if (text && text.trim()) {
        await button.hover();
        await this.capture(`interaction-button-${i}`, `Button hover: ${text.substring(0, 20)}`);
      }
    }
    
    // Capture all inputs
    const inputs = await this.page.$$('input, textarea');
    console.log(`  Found ${inputs.length} input fields`);
    
    for (let i = 0; i < Math.min(inputs.length, 3); i++) {
      const input = inputs[i];
      await input.focus();
      await this.capture(`interaction-input-${i}`, `Input field ${i + 1} focused`);
    }
    
    // Capture all cards/clickable elements
    const cards = await this.page.$$('[class*="card"], [class*="Card"]');
    console.log(`  Found ${cards.length} cards`);
    
    for (let i = 0; i < Math.min(cards.length, 3); i++) {
      const card = cards[i];
      await card.hover();
      await this.capture(`interaction-card-${i}`, `Card ${i + 1} hover state`);
    }
  }

  async captureEdgeCases() {
    console.log('\n⚠️ EDGE CASES & ERROR STATES');
    console.log('-' .repeat(40));
    
    // Long text overflow
    const longText = 'A'.repeat(500);
    const firstInput = await this.page.$('input');
    if (firstInput) {
      await firstInput.type(longText);
      await this.capture('edge-01-long-text', 'Long text overflow in input');
      await firstInput.evaluate(el => el.value = '');
    }
    
    // Rapid clicking
    const clickTarget = await this.page.$('button');
    if (clickTarget) {
      for (let i = 0; i < 5; i++) {
        await clickTarget.click();
        await new Promise(r => setTimeout(r, 100));
      }
      await this.capture('edge-02-rapid-clicks', 'After rapid clicking');
    }
    
    // Network offline
    await this.page.setOfflineMode(true);
    await this.page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    await this.capture('edge-03-offline', 'Offline mode');
    await this.page.setOfflineMode(false);
    
    // Zoom levels
    await this.page.evaluate(() => document.body.style.zoom = '50%');
    await this.capture('edge-04-zoom-out', 'Zoomed out to 50%');
    
    await this.page.evaluate(() => document.body.style.zoom = '150%');
    await this.capture('edge-05-zoom-in', 'Zoomed in to 150%');
    
    await this.page.evaluate(() => document.body.style.zoom = '100%');
  }

  async generateIndex() {
    console.log('\n📄 Generating screenshot index...');
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Exhaustive Screenshot Index</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; position: sticky; top: 0; background: #f5f5f5; padding: 10px 0; }
    .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
    .screenshot-card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .screenshot-card img { width: 100%; height: 150px; object-fit: cover; border-bottom: 1px solid #eee; }
    .screenshot-card .info { padding: 10px; }
    .screenshot-card .number { color: #666; font-size: 12px; }
    .screenshot-card .name { font-weight: 600; margin: 5px 0; }
    .screenshot-card .description { color: #666; font-size: 14px; }
    .filter { margin: 20px 0; }
    .filter input { padding: 10px; width: 300px; border: 1px solid #ddd; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>📸 Exhaustive Screenshot Capture</h1>
  
  <div class="stats">
    <h2>Statistics</h2>
    <p>Total Screenshots: <strong>${this.screenshotCount}</strong></p>
    <p>Categories: Onboarding, Dev Toolkit, Dashboard, Responsive, Interactions, Edge Cases</p>
    <p>Timestamp: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="filter">
    <input type="text" id="filter" placeholder="Filter screenshots..." onkeyup="filterScreenshots()">
  </div>
  
  <div class="screenshot-grid" id="grid">
    ${this.screenshots.map(s => `
      <div class="screenshot-card" data-search="${s.name} ${s.description}">
        <img src="${s.filename}" alt="${s.description}" loading="lazy" onclick="window.open('${s.filename}', '_blank')">
        <div class="info">
          <div class="number">#${s.number}</div>
          <div class="name">${s.name}</div>
          <div class="description">${s.description}</div>
        </div>
      </div>
    `).join('')}
  </div>
  
  <script>
    function filterScreenshots() {
      const filter = document.getElementById('filter').value.toLowerCase();
      const cards = document.querySelectorAll('.screenshot-card');
      cards.forEach(card => {
        const text = card.dataset.search.toLowerCase();
        card.style.display = text.includes(filter) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
    
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), html);
    console.log('✅ Screenshot index created: index.html');
  }

  async run() {
    try {
      await this.setup();
      
      // Capture everything
      await this.captureOnboarding();
      await this.captureDevToolkit();
      await this.captureDashboard();
      await this.captureResponsive();
      await this.captureInteractions();
      await this.captureEdgeCases();
      
      // Generate index
      await this.generateIndex();
      
      console.log('\n' + '=' .repeat(60));
      console.log(`✅ COMPLETE: ${this.screenshotCount} screenshots captured`);
      console.log(`📁 Location: ${OUTPUT_DIR}`);
      console.log('=' .repeat(60));
      
      // Open the index
      const { exec } = require('child_process');
      exec(`open ${path.join(OUTPUT_DIR, 'index.html')}`);
      
      console.log('\n🌐 Opening screenshot index in browser...');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new ExhaustiveScreenshotTest();
  test.run();
}