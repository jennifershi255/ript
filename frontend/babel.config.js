module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Temporarily removing react-native-reanimated plugin to fix startup issues
      // 'react-native-reanimated/plugin',
    ],
  };
};
