// e2e/todayScreen.test.js

const { waitForElement, tapWhenVisible, waitForText } = require('./helpers/wait');
const { getTestLead } = require('./helpers/testData');
const { element, by, expect } = require('detox');

describe('Today Screen', () => {
  beforeAll(async () => {
    await device.reloadReactNative();
  });

  it('should display today screen header', async () => {
    await waitForText('Deine heutigen Ziele', 5000);
  });

  it('should show user stats cards', async () => {
    await waitForElement(by.text('Kontakte'));
    await waitForElement(by.text('Punkte'));
    
    await expect(element(by.text('5'))).toBeVisible();
    await expect(element(by.text('20'))).toBeVisible();
  });

  it('should display squad summary card', async () => {
    await waitForElement(by.text('November Sprint'));
    
    await expect(element(by.text('Rang: #3'))).toBeVisible();
    await expect(element(by.text('180 Punkte'))).toBeVisible();
  });

  it('should show due leads list', async () => {
    const lead = getTestLead(0);
    
    await waitForText('Fällige Kontakte');
    await waitForElement(by.text(lead.name));
  });

  it('should navigate to lead detail when tapping lead card', async () => {
    const lead = getTestLead(0);
    
    await tapWhenVisible(by.text(lead.name));
    
    await waitForText(lead.name, 5000);
    await expect(element(by.text(lead.company_name))).toBeVisible();
  });
});

