import { test, expect } from '@playwright/test';

test.setTimeout(60000); // Increase global timeout to 60s

test('Verify Order Gate App Flow', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'admin@empresa.com');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('http://localhost:5173/dashboard', { timeout: 10000 });

  // 2. Visit Price Catalog (Admin)
  await page.click('text=Price Catalog');
  await expect(page).toHaveURL('http://localhost:5173/admin/prices');
  await page.waitForSelector('text=Price Catalog Management');

  // 3. Upload PDF
  await page.click('text=Dashboard');
  await page.click('text=New Order');
  await expect(page).toHaveURL('http://localhost:5173/upload');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('apps/order-gate/server/sample_order.pdf');

  await page.click('button:has-text("Upload & Validate")');

  // 4. Order Details
  await page.waitForURL(/\/orders\/.+/, { timeout: 15000 });
  await page.waitForSelector('text=Validation Report', { timeout: 15000 });

  // 5. Verify Rejection (min price logic)
  // Allow time for status to settle or API to return
  await expect(page.locator('text=REJECTED')).toBeVisible({ timeout: 10000 });

  // 6. Admin Override
  await page.click('text=Override Rejection');
  await page.fill('textarea', 'Authorized by Manager via Playwright');
  await page.click('button:has-text("Confirm Override")');

  // 7. Verify Exception Status
  await page.waitForTimeout(3000); // Wait for reload
  await expect(page.locator('text=EXCEPTION')).toBeVisible({ timeout: 10000 });
});
