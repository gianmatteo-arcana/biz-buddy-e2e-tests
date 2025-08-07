const { chromium } = require('playwright');

async function testDemoMode() {
  console.log('🎯 Testing Demo Mode functionality...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`💥 Page Error: ${error.message}`);
  });
  
  try {
    console.log('📍 Step 1: Loading app...');
    await page.goto('http://localhost:8080', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    
    // Wait longer for auth check and failsafe
    console.log('⏳ Waiting for auth initialization...');
    await page.waitForTimeout(6000);
    
    // Check initial state
    const initialState = await page.evaluate(() => {
      return {
        hasOnboarding: document.body.textContent.includes('Welcome to SmallBizAlly'),
        hasDemoButton: document.body.textContent.includes('Demo Mode'),
        hasGoogleButton: document.body.textContent.includes('Sign in with Google')
      };
    });
    
    console.log('📊 Initial State:', initialState);
    
    if (!initialState.hasDemoButton) {
      throw new Error('Demo button not found!');
    }
    
    await page.screenshot({ path: 'demo-1-initial.png', fullPage: true });
    
    console.log('\n📍 Step 2: Clicking Demo Mode...');
    await page.getByRole('button', { name: 'Demo Mode' }).click();
    
    // Wait for dashboard to load
    await page.waitForTimeout(3000);
    
    // Check dashboard state
    const dashboardState = await page.evaluate(() => {
      return {
        hasDashboard: document.body.textContent.includes('SmallBizAlly'),
        hasWelcome: document.body.textContent.includes('Welcome back'),
        hasChatButton: document.body.textContent.includes('Chat with Ally'),
        hasCards: document.querySelectorAll('[data-testid*="card"]').length,
        userName: document.querySelector('h1')?.textContent || ''
      };
    });
    
    console.log('📊 Dashboard State:', dashboardState);
    
    await page.screenshot({ path: 'demo-2-dashboard.png', fullPage: true });
    
    if (dashboardState.hasChatButton) {
      console.log('\n📍 Step 3: Opening chat...');
      await page.getByRole('button', { name: 'Chat with Ally' }).click();
      await page.waitForTimeout(2000);
      
      const chatState = await page.evaluate(() => {
        return {
          chatVisible: document.body.textContent.includes('Hide Chat'),
          hasTextarea: !!document.querySelector('textarea'),
          hasSendButton: !!document.querySelector('button[type="submit"]')
        };
      });
      
      console.log('📊 Chat State:', chatState);
      
      await page.screenshot({ path: 'demo-3-chat.png', fullPage: true });
      
      if (chatState.hasTextarea) {
        console.log('\n📍 Step 4: Sending message...');
        await page.fill('textarea', 'Hello, can you help me with my business registration?');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(3000);
        
        const messageState = await page.evaluate(() => {
          const messages = Array.from(document.querySelectorAll('[data-testid="message"]'));
          return {
            messageCount: messages.length,
            lastMessage: messages[messages.length - 1]?.textContent || ''
          };
        });
        
        console.log('📊 Message State:', messageState);
        
        await page.screenshot({ path: 'demo-4-message.png', fullPage: true });
      }
    }
    
    console.log('\n✅ Demo Mode Test Complete!');
    console.log('Screenshots saved:');
    console.log('  - demo-1-initial.png');
    console.log('  - demo-2-dashboard.png');
    console.log('  - demo-3-chat.png');
    console.log('  - demo-4-message.png');
    
  } catch (_error) {
    console.error('💥 Test failed:', error.message);
    await page.screenshot({ path: 'demo-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testDemoMode().catch(console.error);