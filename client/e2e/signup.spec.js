import { expect, test } from 'playwright/test';
import {
  hermyxSignupFixture,
  installHermyxLoginMocks,
} from './support/mockHermyxApp';

test('registers an account and redirects to login', async ({ page }) => {
  await installHermyxLoginMocks(page);

  await page.goto('/signup');

  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();

  const signupRequestPromise = page.waitForRequest('**/api/auth/signup');

  await page
    .getByLabel('Username (required):')
    .fill(hermyxSignupFixture.username);
  await page.getByLabel('E-mail (required):').fill(hermyxSignupFixture.email);
  await page.locator('#signUpPassword').fill(hermyxSignupFixture.password);
  await page
    .locator('#signUpConfirmPassword')
    .fill(hermyxSignupFixture.password);
  await page.getByLabel(/Términos y condiciones de Hermyx/).check();
  await page.locator('#sendSignUp').click();

  const signupRequest = await signupRequestPromise;
  expect(signupRequest.method()).toBe('POST');
  expect(signupRequest.postDataJSON()).toEqual({
    username: hermyxSignupFixture.username,
    email: hermyxSignupFixture.email,
    password: hermyxSignupFixture.password,
    confirmPassword: hermyxSignupFixture.password,
    termsAccepted: true,
  });

  await expect(page).toHaveURL('/login');
  const verificationAlert = page.getByRole('alert');
  await expect(verificationAlert).toBeVisible();
  await expect(verificationAlert).toContainText('Check your e-mail');
  await expect(verificationAlert).toContainText(
    'We sent you a verification link. Confirm your e-mail before logging in.',
  );
});
