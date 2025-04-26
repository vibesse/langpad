import { test, expect } from '@playwright/test';

test('Action component renders correctly', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');

  // Wait for the Action component to be visible
  await page.waitForSelector('[data-testid="action-card"]');

  // Check if the model selector exists
  const modelSelector = await page.getByRole('button', { name: /openai\/gpt/ });
  await expect(modelSelector).toBeVisible();

  // Check if the temperature slider exists
  await expect(page.locator('.slider')).toBeVisible();

  // Test adding a new message
  const addMessageButton = await page.getByRole('button', { name: 'Add message' });
  const initialMessageCount = await page.locator('[data-testid="message-item"]').count();

  await addMessageButton.click();

  const newMessageCount = await page.locator('[data-testid="message-item"]').count();
  expect(newMessageCount).toBe(initialMessageCount + 1);
});
