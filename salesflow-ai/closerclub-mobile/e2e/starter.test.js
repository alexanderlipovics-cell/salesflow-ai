describe('CloserClub Main Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('sollte Login Screen anzeigen', async () => {
    await expect(element(by.id('auth-screen'))).toBeVisible();
  });

  it('sollte User einloggen und Dashboard zeigen', async () => {
    // 1. Credentials eingeben
    await element(by.id('email-input')).typeText('test@closerclub.ai');
    await element(by.id('password-input')).typeText('password123');

    // 2. Keyboard schließen (wichtig bei iOS!)
    await element(by.id('password-input')).tapReturnKey();

    // 3. Login Button drücken
    await element(by.id('login-button')).tap();

    // 4. Warten bis Dashboard erscheint (max 10s)
    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // 5. Check ob Liste da ist
    await expect(element(by.id('leads-list'))).toBeVisible();
  });
});
