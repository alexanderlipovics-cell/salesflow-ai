// e2e/init.js

const detox = require('detox');
const config = require('../package.json').detox;
const { enableMockMode, disableMockMode } = require('./helpers/mockNetwork');
const { cleanupTestData } = require('./helpers/testData');
const { logger } = require('./logger');

beforeAll(async () => {
  logger.debug('🚀 Initializing Detox...');
  await detox.init(config, { launchApp: false });
  
  logger.debug('📱 Launching app...');
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES' },
    launchArgs: { detoxPrintBusyIdleResources: 'YES' }
  });
  
  await enableMockMode();
  
  logger.debug('✅ Detox initialized');
}, 300000);

beforeEach(async () => {
  await device.reloadReactNative();
});

afterEach(async function() {
  if (this.currentTest && this.currentTest.state === 'failed') {
    const testName = this.currentTest.title.replace(/\s/g, '_');
    const timestamp = Date.now();
    const screenshotPath = `./e2e/artifacts/${testName}_${timestamp}.png`;
    
    try {
      await device.takeScreenshot(screenshotPath);
      logger.debug(`📸 Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
    }
  }
});

afterAll(async () => {
  logger.debug('🧹 Cleaning up...');
  
  await disableMockMode();
  await cleanupTestData();
  await detox.cleanup();
  
  logger.debug('✅ Cleanup complete');
});

