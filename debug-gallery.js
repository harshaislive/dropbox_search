const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Go to the page
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Perform a search
  await page.fill('input[placeholder*="Search"]', 'nature');
  await page.click('button:has-text("Search")');
  
  // Wait for results
  await page.waitForSelector('.gallery-item', { timeout: 10000 });
  
  // Get information about gallery items
  const galleryInfo = await page.evaluate(() => {
    const items = document.querySelectorAll('.gallery-item');
    const results = [];
    
    items.forEach((item, index) => {
      if (index < 3) { // First 3 items
        const bottomInfo = item.querySelector('.gallery-bottom-info');
        const filename = item.querySelector('.gallery-filename');
        const basicInfo = item.querySelector('.gallery-basic-info');
        const relevanceBadge = item.querySelector('.gallery-relevance-badge');
        
        results.push({
          index: index + 1,
          hasBottomInfo: !!bottomInfo,
          bottomInfoVisible: bottomInfo ? window.getComputedStyle(bottomInfo).display !== 'none' : false,
          bottomInfoOpacity: bottomInfo ? window.getComputedStyle(bottomInfo).opacity : 'N/A',
          filenameText: filename ? filename.textContent.trim() : 'NOT FOUND',
          basicInfoText: basicInfo ? basicInfo.textContent.trim() : 'NOT FOUND',
          relevanceBadgeText: relevanceBadge ? relevanceBadge.textContent.trim() : 'NOT FOUND',
          relevanceBadgeVisible: relevanceBadge ? window.getComputedStyle(relevanceBadge).display !== 'none' : false
        });
      }
    });
    
    return {
      totalItems: items.length,
      results: results
    };
  });
  
  console.log('Gallery Items Info:');
  console.log(JSON.stringify(galleryInfo, null, 2));
  
  // Take a screenshot
  await page.screenshot({ path: 'gallery-debug.png', fullPage: false });
  
  // Get console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });
  
  await browser.close();
})();