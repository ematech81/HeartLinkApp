// module.exports = function (api) {
//     api.cache(true);
//     return {
//       presets: ['babel-preset-expo'],
//       plugins: ['react-native-reanimated/plugin'],
//     };
//   };
  


module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            screen: './src/screens',
            components: './src/components',
            assets: './src/assets',
            navigation: './src/navigation',
            services: './src/services',
            utils: './src/utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};