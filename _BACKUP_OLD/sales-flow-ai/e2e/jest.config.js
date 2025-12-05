// e2e/jest.config.js

module.exports = {
  testEnvironment: './e2e/detox-environment.js',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/e2e/init.js'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './e2e/artifacts',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],
  verbose: true,
  bail: false
};

