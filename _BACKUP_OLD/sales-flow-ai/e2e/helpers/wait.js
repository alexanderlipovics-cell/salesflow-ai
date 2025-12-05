// e2e/helpers/wait.js

const { waitFor, element, by } = require('detox');

async function waitForElement(matcher, timeout = 5000) {
  await waitFor(element(matcher))
    .toBeVisible()
    .withTimeout(timeout);
}

async function tapWhenVisible(matcher, timeout = 5000) {
  await waitForElement(matcher, timeout);
  await element(matcher).tap();
}

async function waitForText(text, timeout = 5000) {
  await waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout);
}

async function scrollToElement(matcher, scrollViewMatcher, direction = 'down') {
  await waitFor(element(matcher))
    .toBeVisible()
    .whileElement(scrollViewMatcher)
    .scroll(200, direction);
}

async function waitForNoLoading(timeout = 10000) {
  try {
    await waitFor(element(by.id('loading-indicator')))
      .not.toBeVisible()
      .withTimeout(timeout);
  } catch (e) {
    // Loading indicator might not exist, that's ok
  }
}

module.exports = {
  waitForElement,
  tapWhenVisible,
  waitForText,
  scrollToElement,
  waitForNoLoading
};

