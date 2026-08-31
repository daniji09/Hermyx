import { expect, test } from 'playwright/test';
import {
  hermyxLoginFixture,
  installHermyxLoginMocks,
} from './support/mockHermyxApp';

test('logs in through the form and lands on the home page', async ({
  page,
}) => {
  await installHermyxLoginMocks(page, { meDelayMs: 250 });

  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  const loginRequestPromise = page.waitForRequest('**/api/auth/login');
  const meResponsePromise = page.waitForResponse('**/api/users/me');

  await page
    .getByLabel('Username or e-mail (required):')
    .fill(hermyxLoginFixture.hermyxUser.username);
  await page.getByLabel('Password (required):').fill('Aa123456!');
  await page.locator('#sendLogIn').click();

  // Navigation waits for the authenticated Hermyx user, not just Firebase.
  await page.waitForTimeout(50);
  await expect(page).toHaveURL('/login');

  const loginRequest = await loginRequestPromise;
  expect(loginRequest.method()).toBe('POST');
  expect(loginRequest.postDataJSON()).toEqual({
    usernameEmail: hermyxLoginFixture.hermyxUser.username,
    username: hermyxLoginFixture.hermyxUser.username,
    password: 'Aa123456!',
  });

  await meResponsePromise;

  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', {
      name: `Welcome back, ${hermyxLoginFixture.hermyxUser.username}!`,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: new RegExp(hermyxLoginFixture.hermyxUser.username),
    }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: new RegExp(hermyxLoginFixture.hermyxUser.username),
    })
    .click();
  await expect(
    page.getByRole('menuitem', { name: 'My profile' }),
  ).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Log out' })).toBeVisible();
});

test('logs in with Google after the Hermyx user has been hydrated', async ({
  page,
}) => {
  await installHermyxLoginMocks(page, { meDelayMs: 250 });

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  await page.getByRole('button', { name: 'Log in with Google' }).click();

  // The Google sync must not navigate with the partial Firebase user.
  await page.waitForTimeout(50);
  await expect(page).toHaveURL('/login');
  await expect(
    page.getByRole('heading', {
      name: `Welcome back, ${hermyxLoginFixture.hermyxUser.username}!`,
    }),
  ).not.toBeVisible();

  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', {
      name: `Welcome back, ${hermyxLoginFixture.hermyxUser.username}!`,
    }),
  ).toBeVisible();
});
