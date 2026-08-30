import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { expect } from 'playwright/test';

const missionFixture = JSON.parse(
  await readFile(
    new URL('../fixtures/invitation.json', import.meta.url),
    'utf8',
  ),
);

export const ownerUsername =
  process.env.PLAYWRIGHT_OWNER_USERNAME ||
  missionFixture.applicantUsername ||
  'dani';
export const inviteeUsername =
  process.env.PLAYWRIGHT_INVITEE_USERNAME ||
  missionFixture.collaboratorUsername ||
  'wen';
export const ownerPassword =
  process.env.PLAYWRIGHT_OWNER_PASSWORD || process.env.PLAYWRIGHT_PASSWORD;
export const inviteePassword =
  process.env.PLAYWRIGHT_INVITEE_PASSWORD || process.env.PLAYWRIGHT_PASSWORD;
export const hasRealCredentials = Boolean(ownerPassword && inviteePassword);
const actionPauseMs = Number(process.env.PLAYWRIGHT_ACTION_PAUSE_MS || 700);

const pauseAfterAction = (page) => page.waitForTimeout(actionPauseMs);

const fillAndPause = async (page, locator, value) => {
  await locator.fill(String(value));
  await pauseAfterAction(page);
};

export const loginRealUser = async (
  page,
  username,
  userPassword = username === ownerUsername ? ownerPassword : inviteePassword,
) => {
  await page.goto('/login');
  await pauseAfterAction(page);
  await fillAndPause(page, page.locator('#logInUsernameEmail'), username);
  await fillAndPause(page, page.locator('#logInPassword'), userPassword);

  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/login') &&
      response.request().method() === 'POST',
  );
  await page.locator('#sendLogIn').click();
  expect((await loginResponse).status()).toBe(200);
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

export const createMission = async (page, title) => {
  await page.goto('/services/new');
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
      response.url().includes('/api/services') &&
      response.request().method() === 'POST',
  );
  await page.locator('#sendNewMission').click();

  const response = await createResponse;
  expect(response.status()).toBe(201);
  const responseBody = await response.json();
  expect(responseBody.mission.title).toBe(title);
  await expect(page).toHaveURL(
    new RegExp(`/services/${responseBody.mission.mid}$`),
  );
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await pauseAfterAction(page);

  return responseBody.mission.mid;
};

export const inviteUser = async (page, missionId) => {
  await page
    .getByRole('button', { name: /Invite a collaborator|Add collaborator/ })
    .click();
  await pauseAfterAction(page);

  const dialog = page.getByRole('alertdialog', {
    name: 'Search collaborator',
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
      response.url().includes(`/api/services/${missionId}/invite`) &&
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

export const acceptInvitation = async (browser, missionTitle) => {
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
};

export const closeMission = async (page, missionId, missionTitle) => {
  await page.locator('#closeMissionButton').click();
  await pauseAfterAction(page);

  const closeDialog = page.getByRole('alertdialog', {
    name: 'Are you sure you want to close the service?',
  });
  await expect(closeDialog).toBeVisible();
  const closeResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/services/${missionId}/close`) &&
      response.request().method() === 'POST',
  );
  await closeDialog
    .getByRole('button', { name: 'Yes, close service', exact: true })
    .click();
  expect((await closeResponse).status()).toBe(200);
  await pauseAfterAction(page);

  await page.reload();
  await expect(page.getByRole('heading', { name: missionTitle })).toBeVisible();
  await expect(page.getByText(/CLOSED|Closed/)).toBeVisible();
};

const fillTestCardIfNeeded = async (page) => {
  const newCardOption = page.getByRole('radio', {
    name: 'Use a new credit card',
    exact: true,
  });

  if (await newCardOption.count()) {
    await newCardOption.click();
    await expect(newCardOption).toHaveAttribute('aria-checked', 'true');
    await pauseAfterAction(page);
  }

  const cardFrame = page.frameLocator(
    'iframe[title="Secure card payment input frame"]',
  );
  const cardNumber = cardFrame.locator('input[name="cardnumber"]');

  await cardNumber
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => null);

  if (!(await cardNumber.count())) return;

  await cardNumber.fill('4242424242424242');
  await cardFrame.locator('input[name="exp-date"]').fill('1234');
  await cardFrame.locator('input[name="cvc"]').fill('123');
  const postalCode = cardFrame.locator(
    'input[name="postal-code"], input[name="postalCode"], input[name="postal_code"], input[placeholder="ZIP"]',
  );
  if (await postalCode.count()) await postalCode.fill('28001');
  await pauseAfterAction(page);
};

export const startAndPayMission = async (page, missionId, missionTitle) => {
  await page.locator('#payMissionButton').click();
  await pauseAfterAction(page);

  const startDialog = page.getByRole('alertdialog', {
    name: 'Are you sure you want to start the service?',
  });
  await expect(startDialog).toBeVisible();
  await startDialog
    .getByRole('button', { name: 'Yes, start service', exact: true })
    .click();

  await expect(page).toHaveURL(new RegExp(`/services/${missionId}/pay$`));
  await expect(
    page.getByRole('heading', { name: 'Service payment' }).first(),
  ).toBeVisible();
  await expect(page.getByText(missionTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(/Tester/)).toBeVisible();
  await fillTestCardIfNeeded(page);

  const paymentResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/stripe/services/${missionId}/pay/new`) &&
      response.request().method() === 'POST',
  );
  const confirmResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes(`/api/stripe/services/${missionId}/confirm`) &&
        response.request().method() === 'POST',
      { timeout: 60000 },
    )
    .catch(() => null);
  await page.locator('#sendPayment').click();
  expect((await paymentResponse).status()).toBe(200);
  const confirmedPayment = await confirmResponse;
  expect(confirmedPayment).not.toBeNull();
  expect(confirmedPayment.status()).toBe(201);

  await expect(page).toHaveURL(new RegExp(`/services/${missionId}$`), {
    timeout: 60000,
  });
  await expect(page.getByRole('heading', { name: missionTitle })).toBeVisible();
  await expect(page.getByText(/IN_PROGRESS|In progress/).first()).toBeVisible();
  await expect(
    page.getByText(inviteeUsername, { exact: true }).first(),
  ).toBeVisible();
};
