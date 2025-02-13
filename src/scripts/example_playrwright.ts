import { firefox } from '@playwright/test';

async function example() {
  // Launch Firefox
  const browser = await firefox.launch({
    headless: false // Set to true in production
  });
  
  // Create a new page
  const page = await browser.newPage();
  
  // Navigate to a website
  await page.goto('https://google.com');
  
  // Accept cookies - try different selectors as they might vary
  try {
    // Try to find and click the "Accept all" button
    await Promise.race([
      page.click('button:has-text("Αποδοχή όλων")'),
      page.click('button:has-text("Accept all")'),
      page.click('button[aria-label="Accept all"]'),
    ]);
  } catch (error) {
    console.log('Cookie consent banner not found or already accepted');
  }
  
  // Wait for and find elements
  // Remove this line as Google's homepage doesn't have an h1
  // const title = await page.locator('h1').textContent();
  
  // Interact with the page - update selectors to match Google's search input
  await page.fill('textarea[name="q"]', 'my search');  // Google uses textarea with name "q"
  await page.press('textarea[name="q"]', 'Enter');     // Press Enter to perform the search
  // Or click one of the search buttons:
  // await page.click('input[name="btnK"]');          // "Google Search" button
  
  // The result items selector should also be updated if you want to extract results
  const results = await page.$$eval('.g', items => 
    items.map(item => item.textContent)
  );
  
  // Option 1: Add a delay before closing (e.g., 5 seconds)
  await page.waitForTimeout(5000);
  
  // Option 2: Wait for a specific key press (better for debugging)
  console.log('Press "Enter" to close the browser...');
  await page.waitForEvent('close', {timeout: 0}).catch(() => {});
  
  await browser.close();
}

example();