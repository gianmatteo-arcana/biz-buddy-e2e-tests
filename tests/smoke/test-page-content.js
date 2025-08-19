#!/usr/bin/env node

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Checking Page Content\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new'
  });
  const page = await browser.newPage();
  
  // Go to the app
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  await page.waitForTimeout(3000);
  
  // Get detailed page analysis
  const analysis = await page.evaluate(() => {
    const allText = document.body.textContent.trim();
    const htmlLength = document.body.innerHTML.length;
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim());
    const divs = document.querySelectorAll('div').length;
    const svgs = document.querySelectorAll('svg').length;
    
    // Check for specific elements
    const hasReactRoot = !!document.querySelector('#root');
    const hasMainContent = !!document.querySelector('main');
    const hasGoogleButton = !!document.querySelector('button svg path[fill="#4285F4"]');
    
    // Get body structure
    const bodyChildren = Array.from(document.body.children).map(child => ({
      tag: child.tagName,
      id: child.id,
      class: child.className,
      textLength: child.textContent?.trim().length
    }));
    
    return {
      allText,
      textLength: allText.length,
      htmlLength,
      buttons,
      headings,
      divs,
      svgs,
      hasReactRoot,
      hasMainContent,
      hasGoogleButton,
      bodyChildren,
      url: window.location.href
    };
  });
  
  console.log('📊 Page Analysis:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('URL:', analysis.url);
  console.log('Text content length:', analysis.textLength, 'chars');
  console.log('HTML length:', analysis.htmlLength, 'chars');
  console.log('Number of divs:', analysis.divs);
  console.log('Number of SVGs:', analysis.svgs);
  console.log('Has React root:', analysis.hasReactRoot ? '✅' : '❌');
  console.log('Has main content:', analysis.hasMainContent ? '✅' : '❌');
  console.log('Has Google button:', analysis.hasGoogleButton ? '✅' : '❌');
  console.log('\nButtons found:', analysis.buttons.length ? analysis.buttons : 'NONE');
  console.log('Headings found:', analysis.headings.length ? analysis.headings : 'NONE');
  console.log('\nBody structure:');
  analysis.bodyChildren.forEach(child => {
    console.log(`  <${child.tag}${child.id ? ` id="${child.id}"` : ''}> - ${child.textLength} chars`);
  });
  
  console.log('\n📝 Actual text content:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(analysis.allText || '(EMPTY)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await browser.close();
})();

// Polyfill
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}