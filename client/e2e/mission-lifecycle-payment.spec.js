import { expect, test } from 'playwright/test';
import {
  acceptInvitation,
  closeMission,
  createMission,
  inviteUser,
  inviteeUsername,
  loginRealUser,
  ownerUsername,
  password,
  startAndPayMission,
} from './support/realMissionFlow.js';

test('closes, pays and starts a newly created mission', async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  test.skip(
    !password,
    'Set PLAYWRIGHT_PASSWORD to run the real mission lifecycle payment flow.',
  );

  const missionTitle = `Playwright - Lifecycle ${Date.now()}`;
  await loginRealUser(page, ownerUsername);
  const missionId = await createMission(page, missionTitle);
  await inviteUser(page, missionId);
  await acceptInvitation(browser, missionTitle);

  await page.goto(`/missions/${missionId}`);
  await expect(page.getByRole('heading', { name: missionTitle })).toBeVisible();
  await expect(
    page.getByText(inviteeUsername, { exact: true }).first(),
  ).toBeVisible();
  await closeMission(page, missionId, missionTitle);
  await startAndPayMission(page, missionId, missionTitle);
});
