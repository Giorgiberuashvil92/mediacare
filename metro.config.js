const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add support for vector icons and fonts
config.resolver.assetExts.push("ttf", "otf", "woff", "woff2");

// Exclude non-route files from being treated as routes
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable Fast Refresh (should be enabled by default, but let's make sure)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

// Ensure watchFolders includes all necessary directories
config.watchFolders = [__dirname];

module.exports = config;
