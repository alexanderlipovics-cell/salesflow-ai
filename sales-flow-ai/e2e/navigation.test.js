// e2e/navigation.test.js

const { tapWhenVisible, waitForText } = require('./helpers/wait');
const { element, by } = require('detox');

describe('App Navigation', () => {
  it('should navigate between all tabs', async () => {
    // Today
    await tapWhenVisible(by.label('Today'));
    await waitForText('Deine heutigen Ziele');
    
    // Speed Hunter
    await tapWhenVisible(by.label('Speed Hunter'));
    await waitForText('Bereit für den Sprint?');
    
    // Squad
    await tapWhenVisible(by.label('Squad'));
    await waitForText('November Sprint');
    
    // Profile
    await tapWhenVisible(by.label('Profile'));
    await waitForText('Mein Profil');
  });

  it('should maintain state when switching tabs', async () => {
    await tapWhenVisible(by.label('Speed Hunter'));
    await tapWhenVisible(by.text('Session starten'));
    await waitForText('Anna Schmidt', 10000);
    
    await tapWhenVisible(by.label('Today'));
    await waitForText('Deine heutigen Ziele');
    
    await tapWhenVisible(by.label('Speed Hunter'));
    
    await waitForText('Anna Schmidt', 5000);
  });
});

