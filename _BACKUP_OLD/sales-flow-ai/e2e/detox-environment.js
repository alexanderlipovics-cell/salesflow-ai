// e2e/detox-environment.js

const DetoxCircusEnvironment = require('detox/runners/jest-circus');
const SpecReporter = require('detox/runners/jest-circus/SpecReporter');
const AssignReporter = require('detox/runners/jest-circus/AssignReporter');
const { logger } = require('./logger');

class CustomDetoxEnvironment extends DetoxCircusEnvironment {
  constructor(config, context) {
    super(config, context);

    this.registerListeners({
      SpecReporter,
      AssignReporter,
    });
  }

  async handleTestEvent(event, state) {
    if (event.name === 'test_fn_failure') {
      logger.debug(`❌ Test failed: ${event.test.name}`);
    }

    await super.handleTestEvent(event, state);
  }
}

module.exports = CustomDetoxEnvironment;

