// jest-setup.js

import '@testing-library/jest-native/extend-expect';
import {jest} from '@jest/globals';

// Optional: Mocken Sie Expo Modules, falls diese in der App verwendet werden
jest.mock('expo-modules-core', () => ({
  requireNativeViewManager: jest.fn(),
  requireNativeModule: jest.fn(),
}));

// Mock AsyncStorage, falls es verwendet wird
jest.mock('@react-native-async-storage/async-storage', () => 
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

