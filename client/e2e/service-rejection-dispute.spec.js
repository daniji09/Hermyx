import { readFile } from 'node:fs/promises';
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

const missionFixture = JSON.parse(
  await readFile(
    new URL('./fixtures/invitation.json', import.meta.url),
    'utf8',
  ),
);

test('lets a collaborator dispute an applicant rejection', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  test.skip(
    !hasRealCredentials,
    'Set PLAYWRIGHT_OWNER_PASSWORD and PLAYWRIGHT_INVITEE_PASSWORD (or PLAYWRIGHT_PASSWORD) to run the rejection dispute flow.',
  );

  const missionTitle = `Playwright - Rejection ${Date.now()}`;
  await loginRealUser(page, ownerUsername);
  const missionId = await createMission(page, missionTitle);
  await inviteUser(page, missionId);
  await acceptInvitation(browser, missionTitle);

  await page.goto(`/missions/${missionId}`);
  await closeMission(page, missionId, missionTitle);
  await startAndPayMission(page, missionId, missionTitle);

  const inviteeContext = await browser.newContext();
  const inviteePage = await inviteeContext.newPage();

  try {
    await loginRealUser(inviteePage, inviteeUsername);
    await inviteePage.goto(`/missions/${missionId}`);
    await expect(
      inviteePage.getByRole('heading', { name: missionTitle }),
    ).toBeVisible();

    const submitButton = inviteePage.locator('#submitParticipationButton');
    await submitButton.click();
    const submitDialog = inviteePage.getByRole('alertdialog', {
      name: 'Submit your participation?',
    });
    const submitResponse = inviteePage.waitForResponse(
      (response) =>
        response.url().includes(`/api/missions/${missionId}/submit`) &&
        response.request().method() === 'POST',
    );
    await submitDialog
      .getByRole('button', { name: 'Yes, submit participation', exact: true })
      .click();
    expect((await submitResponse).status()).toBe(200);

    await page.goto('/notifications');
    await page
      .locator('ul[aria-label="Notifications list"]')
      .waitFor({ state: 'visible' });
    const reviewNotification = page
      .locator('li')
      .filter({ has: page.locator(`a[aria-label="${missionTitle}"]`) })
      .filter({
        has: page.getByRole('button', { name: 'Reject', exact: true }),
      });
    await expect(reviewNotification).toHaveCount(1);

    const rejectResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/notifications/') &&
        response.url().endsWith('/respond') &&
        response.request().method() === 'POST',
    );
    await reviewNotification
      .getByRole('button', { name: 'Reject', exact: true })
      .click();
    expect((await rejectResponse).status()).toBe(200);

    await inviteePage.goto('/notifications');
    await inviteePage
      .locator('ul[aria-label="Notifications list"]')
      .waitFor({ state: 'visible' });
    const rejectionNotification = inviteePage
      .locator('li')
      .filter({
        has: inviteePage.locator(`a[aria-label="${missionTitle}"]`),
      })
      .filter({
        has: inviteePage.getByRole('button', {
          name: 'Dispute',
          exact: true,
        }),
      });
    await expect(rejectionNotification).toHaveCount(1);

    await rejectionNotification
      .getByRole('button', { name: 'Dispute', exact: true })
      .click();
    const disputeDialog = inviteePage.getByRole('dialog', {
      name: 'Open dispute',
    });
    await expect(disputeDialog).toBeVisible();
    await disputeDialog
      .getByLabel('Reason (required):')
      .fill(missionFixture.disputeReason);

    const disputeResponse = inviteePage.waitForResponse(
      (response) =>
        response.url().includes('/api/notifications/') &&
        response.url().endsWith('/respond') &&
        response.request().method() === 'POST',
    );
    await disputeDialog
      .getByRole('button', { name: 'Open dispute', exact: true })
      .click();
    expect((await disputeResponse).status()).toBe(200);
    await expect(disputeDialog).toBeHidden();
    const disputedNotification = inviteePage.locator('li').filter({
      has: inviteePage.locator(`a[aria-label="${missionTitle}"]`),
    });
    await expect(
      disputedNotification.getByRole('link', { name: 'Open dispute' }),
    ).toBeVisible();

    await inviteePage.goto(`/missions/${missionId}`);
    await expect(
      inviteePage.getByText('Your participation has been disputed.'),
    ).toBeVisible();
  } finally {
    await inviteeContext.close();
  }
});
