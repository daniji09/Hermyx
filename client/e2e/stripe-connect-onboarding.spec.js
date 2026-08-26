import { expect, test } from 'playwright/test';
import {
  loginRealUser,
  ownerPassword,
  ownerUsername,
} from './support/realMissionFlow.js';

test('opens Stripe Connect onboarding from the profile', async ({ page }) => {
  test.setTimeout(120000);
  test.skip(
    !ownerPassword,
    'Set PLAYWRIGHT_OWNER_PASSWORD or PLAYWRIGHT_PASSWORD to run the Stripe Connect flow.',
  );

  await loginRealUser(page, ownerUsername);
  await page.goto('/profile');

  const paymentSettings = page.locator('#payment-settings');
  await expect(paymentSettings).toBeVisible();

  const addBankAccountButton = page.locator('#addBankAccountButton');
  await expect(addBankAccountButton).toHaveText('Add account');

  const onboardingResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/stripe/connect/onboard') &&
      response.request().method() === 'POST',
  );

  await addBankAccountButton.click();

  const response = await onboardingResponse;
  expect(response.status()).toBe(200);

  await page.waitForURL((url) => url.hostname === 'connect.stripe.com', {
    timeout: 30000,
  });
});
