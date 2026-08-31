import { expect, test } from 'playwright/test';
import {
  acceptInvitation,
  closeMission,
  createMission,
  inviteUser,
  inviteeUsername,
  loginRealUser,
  hasRealCredentials,
  ownerUsername,
  startAndPayMission,
} from './support/realServiceFlow.js';

test('submits a participation and lets the applicant approve it', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  test.skip(
    !hasRealCredentials,
    'Set PLAYWRIGHT_OWNER_PASSWORD and PLAYWRIGHT_INVITEE_PASSWORD (or PLAYWRIGHT_PASSWORD) to run the real submission and review flow.',
  );

  const missionTitle = `Playwright - Delivery ${Date.now()}`;
  await loginRealUser(page, ownerUsername);
  const missionId = await createMission(page, missionTitle);
  await inviteUser(page, missionId);
  await acceptInvitation(browser, missionTitle);

  await page.goto(`/services/${missionId}`);
  await expect(page.getByRole('heading', { name: missionTitle })).toBeVisible();
  await closeMission(page, missionId, missionTitle);
  await startAndPayMission(page, missionId, missionTitle);

  const inviteeContext = await browser.newContext();
  const inviteePage = await inviteeContext.newPage();

  try {
    await loginRealUser(inviteePage, inviteeUsername);
    await inviteePage.goto(`/services/${missionId}`);
    await expect(
      inviteePage.getByRole('heading', { name: missionTitle }),
    ).toBeVisible();
    await expect(
      inviteePage.getByText(/IN_PROGRESS|In progress/).first(),
    ).toBeVisible();

    const submitButton = inviteePage.locator('#submitParticipationButton');
    await expect(submitButton).toHaveText('Submit my part');
    await submitButton.click();

    const submitDialog = inviteePage.getByRole('alertdialog', {
      name: 'Submit your participation?',
    });
    await expect(submitDialog).toBeVisible();
    const submitResponse = inviteePage.waitForResponse(
      (response) =>
        response.url().includes(`/api/services/${missionId}/submit`) &&
        response.request().method() === 'POST',
    );
    await submitDialog
      .getByRole('button', { name: 'Yes, submit participation', exact: true })
      .click();
    expect((await submitResponse).status()).toBe(200);
    await expect(submitButton).toHaveText(/SUBMITTED/i);

    await page.goto('/notifications');
    await page
      .locator('ul[aria-label="Notifications list"]')
      .waitFor({ state: 'visible' });

    const missionNotification = page
      .locator('li')
      .filter({ has: page.locator(`a[aria-label="${missionTitle}"]`) });
    const notification = missionNotification.filter({
      has: page.getByRole('button', { name: 'Approve', exact: true }),
    });
    await expect(notification).toHaveCount(1);
    const missionLink = notification.getByRole('link', {
      name: missionTitle,
      exact: true,
    });
    await expect(missionLink).toBeVisible();
    await expect(
      notification.getByRole('button', { name: 'Approve', exact: true }),
    ).toBeVisible();

    const approveResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/notifications/') &&
        response.url().endsWith('/respond') &&
        response.request().method() === 'POST',
    );
    await notification
      .getByRole('button', { name: 'Approve', exact: true })
      .click();
    expect((await approveResponse).status()).toBe(200);
    await expect(missionNotification.getByText(/ACCEPTED/i)).toBeVisible();

    await inviteePage.reload();
    await expect(
      inviteePage.getByRole('heading', { name: missionTitle }),
    ).toBeVisible();
    await expect(inviteePage.locator('#submitParticipationButton')).toHaveText(
      /RELEASED/i,
    );
  } finally {
    await inviteeContext.close();
  }
});
