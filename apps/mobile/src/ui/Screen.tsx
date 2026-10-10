import { Platform, SafeAreaView, ScrollView, StatusBar, View } from "react-native";
import { useTheme } from "../theme";
import { Reveal } from "./motion";

/** Safe area, comfortable width and padding. Scrolls by default; pass scroll={false} for fixed layouts. */
export function Screen({ children, scroll = true, footer }: { children: React.ReactNode; scroll?: boolean; footer?: React.ReactNode }) {
  const { palette, scheme } = useTheme();
  const top = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background, paddingTop: top }}>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} backgroundColor={palette.background} />
      <Body
        style={{ flex: 1 }}
        {...(scroll ? { contentContainerStyle: { padding: 20, paddingBottom: 28, gap: 16, width: "100%", maxWidth: 560, alignSelf: "center" }, keyboardShouldPersistTaps: "handled" as const } : {})}
      >
        {scroll ? (
          <Reveal distance={6} style={{ gap: 16 }}>
            {children}
          </Reveal>
        ) : (
          <Reveal distance={6} style={{ flex: 1, padding: 20, gap: 16, width: "100%", maxWidth: 560, alignSelf: "center" }}>
            {children}
          </Reveal>
        )}
      </Body>
      {footer && <View style={{ padding: 20, paddingTop: 8, width: "100%", maxWidth: 560, alignSelf: "center", gap: 10 }}>{footer}</View>}
    </SafeAreaView>
  );
}
