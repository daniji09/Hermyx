import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { expect, test } from 'playwright/test';
import {
  inviteePassword,
  inviteeUsername as configuredInviteeUsername,
  ownerPassword,
  ownerUsername as configuredOwnerUsername,
} from './support/realMissionFlow.js';

const missionFixture = JSON.parse(
  await readFile(
    new URL('./fixtures/invitation.json', import.meta.url),
    'utf8',
  ),
);

const ownerUsername =
  process.env.PLAYWRIGHT_OWNER_USERNAME ||
  missionFixture.ownerUsername ||
  configuredOwnerUsername;
const inviteeUsername =
  process.env.PLAYWRIGHT_INVITEE_USERNAME ||
  missionFixture.inviteeUsername ||
  configuredInviteeUsername;
const actionPauseMs = Number(process.env.PLAYWRIGHT_ACTION_PAUSE_MS || 700);

const pauseAfterAction = (page) => page.waitForTimeout(actionPauseMs);

const fillAndPause = async (page, locator, value) => {
  await locator.fill(String(value));
  await pauseAfterAction(page);
};

const loginRealUser = async (page, username) => {
  const password = username === ownerUsername ? ownerPassword : inviteePassword;

  await page.goto('/login');
  await pauseAfterAction(page);
  await fillAndPause(page, page.locator('#logInUsernameEmail'), username);
  await fillAndPause(page, page.locator('#logInPassword'), password);

  const meResponse = page.waitForResponse('**/api/users/me');
  await page.locator('#sendLogIn').click();
  await meResponse;
  await expect(page).toHaveURL('/');
  await pauseAfterAction(page);
};

const selectMissionLocation = async (page, location) => {
  const map = page.locator('.leaflet-container');
  const locationInput = page.locator('#mapLocation');
  const locationForm = page.locator('form').filter({ has: locationInput });

  await fillAndPause(page, locationInput, location);

  const geocodingResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes('nominatim.openstreetmap.org/search'),
      { timeout: 10000 },
    )
    .catch(() => null);

  await locationForm.getByRole('button', { name: 'Search' }).click();
  await pauseAfterAction(page);
  await geocodingResponse;

  const removeLocationButton = page.getByRole('button', {
    name: 'Remove location',
  });

  if (!(await removeLocationButton.isVisible())) {
    await map.waitFor({ state: 'visible' });
    await map.click({ position: { x: 400, y: 180 }, force: true });
    await pauseAfterAction(page);
  }

  await expect(removeLocationButton).toBeVisible();
};

const createMission = async (page, title) => {
  await page.goto('/missions/new');
  await page.locator('#newMissionTitle').waitFor({ state: 'visible' });
  await pauseAfterAction(page);
  await fillAndPause(page, page.locator('#newMissionTitle'), title);
  await fillAndPause(
    page,
    page.locator('#newMissionDescription'),
    missionFixture.description,
  );

  await page.locator('#addVacanciesButton').click();
  await pauseAfterAction(page);

  const dialog = page.getByRole('dialog');
  await fillAndPause(page, dialog.locator('#vacanciesQuantity'), 1);
  await fillAndPause(
    page,
    dialog.locator('#vacanciesReward'),
    missionFixture.vacancy.reward,
  );
  await fillAndPause(
    page,
    dialog.locator('#vacanciesTitle'),
    missionFixture.vacancy.title,
  );
  await fillAndPause(
    page,
    dialog.locator('#vacanciesDescription'),
    missionFixture.vacancy.description,
  );
  await dialog.getByRole('button', { name: 'Add to group' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await pauseAfterAction(page);

  await selectMissionLocation(page, missionFixture.location);

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/missions') &&
      response.request().method() === 'POST',
  );
  await page.locator('#sendNewMission').click();

  const response = await createResponse;
  expect(response.status()).toBe(201);
  const responseBody = await response.json();
  expect(responseBody.mission.title).toBe(title);
  await expect(page).toHaveURL(
    new RegExp(`/missions/${responseBody.mission.mid}$`),
  );
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await pauseAfterAction(page);

  return responseBody.mission.mid;
};

const inviteUser = async (page, missionId) => {
  await page
    .getByRole('button', { name: /Invite an adventurer|Add adventurer/ })
    .click();
  await pauseAfterAction(page);

  const dialog = page.getByRole('alertdialog', {
    name: 'Search adventurer',
  });
  await expect(dialog).toBeVisible();
  await fillAndPause(
    page,
    dialog.locator('#searchAdventurerByUsername'),
    inviteeUsername,
  );

  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/users/search') &&
      response.request().method() === 'GET',
  );
  await dialog.getByRole('button', { name: 'Search' }).click();
  expect((await searchResponse).status()).toBe(200);
  await expect(
    dialog.getByText(inviteeUsername, { exact: true }),
  ).toBeVisible();
  await pauseAfterAction(page);

  const userResult = dialog
    .getByText(inviteeUsername, { exact: true })
    .locator('xpath=ancestor::div[.//button[normalize-space()="Invite"]][1]');
  await userResult.getByRole('button', { name: 'Invite', exact: true }).click();
  await pauseAfterAction(page);
  const vacancyOption = dialog
    .locator('#invitationVacancy option')
    .filter({ hasText: missionFixture.vacancy.title })
    .first();
  await expect(vacancyOption).toHaveCount(1);
  const vacancyValue = await vacancyOption.getAttribute('value');
  expect(vacancyValue).toBeTruthy();
  await dialog.locator('#invitationVacancy').selectOption(vacancyValue);
  await pauseAfterAction(page);
  await fillAndPause(
    page,
    dialog.locator('#notificationMessage'),
    missionFixture.invitationMessage,
  );

  const invitationResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/missions/${missionId}/invite`) &&
      response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Send invitation' }).click();
  expect((await invitationResponse).status()).toBe(200);
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText('Invitation sent', { exact: true }),
  ).toBeVisible();
  await pauseAfterAction(page);
};

test('invites an adventurer and accepts the invitation with a second account', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  test.skip(
    !ownerPassword || !inviteePassword,
    'Set PLAYWRIGHT_OWNER_PASSWORD and PLAYWRIGHT_INVITEE_PASSWORD (or PLAYWRIGHT_PASSWORD) to run the real invitation acceptance flow.',
  );

  const missionTitle = `${missionFixture.title} ${Date.now()}`;
  await loginRealUser(page, ownerUsername);
  const missionId = await createMission(page, missionTitle);
  await inviteUser(page, missionId);

  const inviteeContext = await browser.newContext();
  const inviteePage = await inviteeContext.newPage();

  try {
    await loginRealUser(inviteePage, inviteeUsername);
    await inviteePage.goto('/notifications');
    await inviteePage
      .locator('ul[aria-label="Notifications list"]')
      .waitFor({ state: 'visible' });
    await pauseAfterAction(inviteePage);

    const missionLink = inviteePage.getByRole('link', {
      name: missionTitle,
      exact: true,
    });
    await expect(missionLink).toBeVisible();
    const notification = missionLink.locator('xpath=ancestor::li');
    await expect(notification).toHaveCount(1);
    await expect(
      notification.getByRole('button', { name: 'Accept', exact: true }),
    ).toBeVisible();

    const acceptResponse = inviteePage.waitForResponse(
      (response) =>
        response.url().includes('/api/notifications/') &&
        response.url().endsWith('/respond') &&
        response.request().method() === 'POST',
    );
    await notification
      .getByRole('button', { name: 'Accept', exact: true })
      .click();
    expect((await acceptResponse).status()).toBe(200);
    await expect(
      notification.getByRole('button', { name: 'Accept', exact: true }),
    ).toHaveCount(0);
    await pauseAfterAction(inviteePage);
  } finally {
    await inviteeContext.close();
  }

  await page.goto(`/missions/${missionId}`);
  await expect(page.getByRole('heading', { name: missionTitle })).toBeVisible();
  await expect(
    page.getByText(inviteeUsername, { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('Joined', { exact: true })).toBeVisible();
  await pauseAfterAction(page);
});
