import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { expect, test } from 'playwright/test';

const missionBatch = JSON.parse(
  await readFile(new URL('./fixtures/missions.json', import.meta.url), 'utf8'),
);

const username = process.env.PLAYWRIGHT_USERNAME;
const password = process.env.PLAYWRIGHT_PASSWORD;
const actionPauseMs = Number(process.env.PLAYWRIGHT_ACTION_PAUSE_MS || 700);

const pauseAfterAction = (page) => page.waitForTimeout(actionPauseMs);

const fillAndPause = async (page, locator, value) => {
  await locator.fill(String(value));
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

test('creates the configured missions through the real UI', async ({
  page,
}) => {
  test.skip(
    !username || !password,
    'Set PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD to run the real mission batch.',
  );

  await page.goto('/login');
  await pauseAfterAction(page);
  await fillAndPause(page, page.locator('#logInUsernameEmail'), username);
  await fillAndPause(page, page.locator('#logInPassword'), password);

  const meResponse = page.waitForResponse('**/api/users/me');
  await page.locator('#sendLogIn').click();
  await meResponse;
  await expect(page).toHaveURL('/');
  await pauseAfterAction(page);

  for (const missionData of missionBatch) {
    const { title } = missionData;

    await page.goto('/missions/new');
    await page.locator('#newMissionTitle').waitFor({ state: 'visible' });
    await pauseAfterAction(page);
    await fillAndPause(page, page.locator('#newMissionTitle'), title);
    await fillAndPause(
      page,
      page.locator('#newMissionDescription'),
      missionData.description,
    );

    await page.locator('#addVacanciesButton').click();
    await pauseAfterAction(page);

    const dialog = page.getByRole('dialog');
    await dialog.locator('#vacanciesQuantity').fill('1');
    await pauseAfterAction(page);
    await dialog
      .locator('#vacanciesReward')
      .fill(String(missionData.vacancy.reward));
    await pauseAfterAction(page);
    await dialog.locator('#vacanciesTitle').fill(missionData.vacancy.title);
    await pauseAfterAction(page);
    await dialog
      .locator('#vacanciesDescription')
      .fill(missionData.vacancy.description);
    await pauseAfterAction(page);
    await dialog.getByRole('button', { name: 'Add to group' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await pauseAfterAction(page);

    await selectMissionLocation(page, missionData.location);

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
  }
});
