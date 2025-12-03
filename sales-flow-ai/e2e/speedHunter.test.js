// e2e/speedHunter.test.js

const { waitForElement, tapWhenVisible, waitForText } = require('./helpers/wait');
const { getTestSession } = require('./helpers/testData');
const { element, by, expect } = require('detox');

describe('Speed Hunter Flow', () => {
  beforeEach(async () => {
    await element(by.label('Speed Hunter')).tap();
    await waitForText('Bereit für den Sprint?', 5000);
  });

  it('should show pre-session state', async () => {
    await expect(element(by.text('Bereit für den Sprint?'))).toBeVisible();
    await expect(element(by.text('Session starten'))).toBeVisible();
  });

  it('should start session and show first lead', async () => {
    const session = getTestSession();
    const firstLead = session.current_lead;
    
    await tapWhenVisible(by.text('Session starten'));
    
    await waitForText(firstLead.name, 10000);
    
    await expect(element(by.text(firstLead.company_name))).toBeVisible();
    await expect(element(by.text(firstLead.disc_primary))).toBeVisible();
  });

  it('should show action buttons in session', async () => {
    const session = getTestSession();
    
    await tapWhenVisible(by.text('Session starten'));
    await waitForText(session.current_lead.name);
    
    await expect(element(by.text('WhatsApp'))).toBeVisible();
    await expect(element(by.text('Call'))).toBeVisible();
    await expect(element(by.text('Später'))).toBeVisible();
    await expect(element(by.text('Erledigt'))).toBeVisible();
  });

  it('should mark lead as done and load next', async () => {
    await tapWhenVisible(by.text('Session starten'));
    await waitForElement(by.text('Erledigt'));
    
    await tapWhenVisible(by.text('Erledigt'));
    
    // Should load next lead or show completion
    await waitForElement(by.text('Erledigt'), 10000);
  });
});

