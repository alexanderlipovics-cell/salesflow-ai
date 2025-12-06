const detox = require('detox');
const config = require('../.detoxrc.json');

jest.setTimeout(120000);

beforeAll(async () => {
  await detox.init(config);
});

beforeEach(async () => {
  await device.reloadReactNative();
});

afterAll(async () => {
  await detox.cleanup();
});
