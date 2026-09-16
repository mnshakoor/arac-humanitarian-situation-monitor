import { test, expect } from '@playwright/test';

test('core monitor loads and country workspace opens', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#data-status')).not.toHaveText('...');
  await expect(page.locator('[data-view="global"]')).toHaveAttribute('aria-current','page');
  await page.locator('[data-view="countries"]').click();
  const select=page.locator('#country-select');
  await expect(select).toBeVisible();
  const values=await select.locator('option').evaluateAll(opts=>opts.map(o=>o.value).filter(Boolean));
  expect(values.length).toBeGreaterThan(0);
  await select.selectOption(values[0]);
  await expect(page.locator('#country-workspace h2')).toBeVisible();
  await expect(page.locator('#country-workspace .v03-analytics')).toBeVisible();
});

test('source register and disaster explorer are operational', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('[data-view="sources"]')).toBeVisible();
  await page.locator('[data-view="sources"]').click();
  await expect(page.locator('#view-sources h1')).toHaveText('Source Register');
  await page.locator('[data-view="disasters"]').click();
  await expect(page.locator('#disaster-list')).toBeVisible();
  if(await page.locator('.disaster-card').count()) await expect(page.locator('.disaster-card').first()).toBeVisible();
});

test('production controls are keyboard accessible', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#data-health')).toBeVisible();
  await page.locator('#data-health').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#data-health-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#data-health-panel')).toBeHidden();
  await expect(page.locator('.skip-link')).toHaveAttribute('href','#main-content');
});
