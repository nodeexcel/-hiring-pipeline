import type { ExpoConfig } from "expo/config";
import base from "./app.json";

// Plain http is only for testing against a local server. Android blocks cleartext traffic in
// release builds, so it is switched on only when the API URL is http; an https API keeps the
// platform default (blocked).
const api = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

export default (): ExpoConfig => ({
  ...(base.expo as ExpoConfig),
  plugins: [
    ...((base.expo.plugins as string[]) ?? []),
    ["expo-build-properties", { android: { usesCleartextTraffic: api.startsWith("http://") } }],
  ],
});
