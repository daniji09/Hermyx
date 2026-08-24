import { expect, test } from 'playwright/test';
import {
  hermyxLoginFixture,
  installHermyxLoginMocks,
} from './support/mockHermyxApp';

test('logs in through the form and lands on the home page', async ({
  page,
}) => {
  await installHermyxLoginMocks(page);

  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  const loginRequestPromise = page.waitForRequest('**/api/auth/login');
  const meResponsePromise = page.waitForResponse('**/api/users/me');

  await page
    .getByLabel('Username or e-mail (required):')
    .fill(hermyxLoginFixture.hermyxUser.username);
  await page.getByLabel('Password (required):').fill('Aa123456!');
  await page.locator('#sendLogIn').click();

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
      name: `Welcome again, ${hermyxLoginFixture.hermyxUser.username}!`,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Go to my profile',
    }),
  ).toContainText(hermyxLoginFixture.hermyxUser.username);
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
});
