import { requireOptionalNativeModule } from "expo";

interface KioskPin {
  start(): void;
  stop(): void;
}

// Missing on iOS, in Expo Go, or if the dev build predates the module: degrade silently.
const native = requireOptionalNativeModule<KioskPin>("KioskPin");

export const kiosk = {
  available: native != null,
  start: () => native?.start(),
  stop: () => native?.stop(),
};
