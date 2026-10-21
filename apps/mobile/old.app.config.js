export default {
  expo: {
    name: "DevLife",
    slug: "devlife",
    scheme: "devlife",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [],
    ios: { supportsTablet: true },
    android: { adaptiveIcon: { backgroundColor: "#ffffff" } },
    web: { bundler: "metro" },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3333"
    }
  }
};