import NetInfo from "@react-native-community/netinfo";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Watches the test for the signals the rules promise to record. Flags are evidence for a
 * human to judge, not proof of cheating. Android blocks screenshots outright; iOS can only
 * tell us that one was taken.
 */
export function useProctor(active: boolean, onEvent: (type: string, detail?: unknown) => void) {
  const emit = useRef(onEvent);
  emit.current = onEvent;

  useEffect(() => {
    if (!active) return;
    const unsubscribeNet = NetInfo.addEventListener((s) => {
      if (s.isConnected === true) emit.current("internet_on");
    });
    const appState = AppState.addEventListener("change", (s) => {
      if (s !== "active") emit.current("app_background", { state: s });
    });
    void ScreenCapture.preventScreenCaptureAsync().catch(() => undefined);
    const shot = ScreenCapture.addScreenshotListener(() => emit.current("screenshot"));
    return () => {
      unsubscribeNet();
      appState.remove();
      shot.remove();
      void ScreenCapture.allowScreenCaptureAsync().catch(() => undefined);
    };
  }, [active]);
}
