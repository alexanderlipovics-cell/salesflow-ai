/**
 * Metro configuration for AURA OS
 * Disable Expo Router auto-detection (we use React Navigation)
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Wichtig: Expo Router deaktivieren
// src/app enthält Python-Backend-Dateien, nicht Expo Router
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  // Python-Dateien ausschließen
  /.*\.py$/,
  /.*__pycache__.*/,
  // src/app als Router-Verzeichnis blockieren
  /src[\/\\]app[\/\\].*/,
];

// Explizit sourceExts ohne Python
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  ext => ext !== 'py'
);

module.exports = config;

