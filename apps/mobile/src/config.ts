// The Android emulator reaches the host machine at 10.0.2.2. Set EXPO_PUBLIC_API_URL per build
// (for example your deployed URL, or http://<your-computer-ip>:3000 for a physical phone).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";
