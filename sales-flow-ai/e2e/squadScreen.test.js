// e2e/squadScreen.test.js

const { waitForElement, waitForText } = require('./helpers/wait');
const { element, by, expect } = require('detox');

describe('Squad Screen', () => {
  beforeEach(async () => {
    await element(by.label('Squad')).tap();
    await waitForText('November Sprint', 5000);
  });

  it('should display challenge hero box', async () => {
    await expect(element(by.text('November Sprint'))).toBeVisible();
    await expect(element(by.text('2000'))).toBeVisible();
  });

  it('should show leaderboard with ranks', async () => {
    await waitForElement(by.text('Sabrina'));
    await expect(element(by.text('Marco'))).toBeVisible();
    await expect(element(by.text('Test User'))).toBeVisible();
  });

  it('should highlight current user in leaderboard', async () => {
    await waitForElement(by.text('Test User'));
    await expect(element(by.text('Rang: #3'))).toBeVisible();
  });
});

