// e2e/helpers/mockNetwork.js

const { getMockResponse } = require('../mocks/mockServer');
const { logger } = require('../logger');

async function enableMockMode() {
  // Block real API calls
  await device.setURLBlacklist(['https://*.supabase.co/*']);
  
  logger.debug('✅ Mock mode enabled - real API calls blocked');
}

async function disableMockMode() {
  await device.setURLBlacklist([]);
  logger.debug('✅ Mock mode disabled');
}

module.exports = {
  enableMockMode,
  disableMockMode
};

