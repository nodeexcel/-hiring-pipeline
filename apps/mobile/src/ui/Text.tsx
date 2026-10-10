import { Platform, Text as RNText, type TextProps } from "react-native";
import { fonts, useTheme } from "../theme";

type Variant = "body" | "small" | "label" | "title" | "h1" | "brand" | "mono";

const STYLES: Record<Variant, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }> = {
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20 },
  title: { fontFamily: fonts.display, fontSize: 18, lineHeight: 26, letterSpacing: -0.2 },
  h1: { fontFamily: fonts.sansMedium, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  brand: { fontFamily: fonts.brand, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  mono: { fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) as string, fontSize: 15, lineHeight: 22 },
};

export function Text({ variant = "body", muted, style, ...props }: TextProps & { variant?: Variant; muted?: boolean }) {
  const { palette } = useTheme();
  return <RNText {...props} style={[STYLES[variant], { color: muted ? palette.muted : palette.foreground }, style]} />;
}

/** The cream Montserrat phrase. One per paragraph. */
export function Highlight({ children }: { children: string }) {
  const { palette } = useTheme();
  return <RNText style={{ fontFamily: fonts.displayMedium, color: palette.highlight, letterSpacing: -0.3 }}>{children}</RNText>;
}
