// e2e/helpers/testData.js

const { MOCK_TODAY_DATA, MOCK_SPEED_HUNTER_SESSION } = require('../mocks/mockServer');
const { logger } = require('../logger');

function getTestLead(index = 0) {
  return MOCK_TODAY_DATA.due_leads[index];
}

function getTestSession() {
  return MOCK_SPEED_HUNTER_SESSION;
}

async function cleanupTestData() {
  logger.debug('🧹 Cleanup test data');
}

module.exports = {
  getTestLead,
  getTestSession,
  cleanupTestData
};

