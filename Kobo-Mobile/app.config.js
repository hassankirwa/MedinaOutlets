/* eslint-disable @typescript-eslint/no-require-imports */
const appJson = require("./app.json");

module.exports = () => ({
  expo: {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins ?? []), "expo-secure-store"],
    extra: {
      ...appJson.expo.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://outlets.dotcreative.co.ke",
    },
  },
});
