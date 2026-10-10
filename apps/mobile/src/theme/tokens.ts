/**
 * ChaiUI tokens (from the skill's tokens.css) as React Native values. oklch is converted to hex.
 * Rules carried over: dark first, pure neutral greys, one cream highlight, orange never a fill,
 * warm hairline cards with no shadow, status as text or a thin outline.
 */
export interface Palette {
  background: string;
  foreground: string;
  muted: string;
  card: string;
  cardFill: string;
  cardEdge: string;
  cardEdgeHover: string;
  border: string;
  input: string;
  primary: string;
  primaryForeground: string;
  highlight: string;
  destructive: string;
  success: string;
  warning: string;
}

export const dark: Palette = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  muted: "#a3a3a3",
  card: "#171717",
  cardFill: "rgba(0,0,0,0.25)",
  cardEdge: "rgba(255,247,237,0.15)",
  cardEdgeHover: "rgba(255,247,237,0.30)",
  border: "rgba(255,255,255,0.10)",
  input: "rgba(255,255,255,0.15)",
  primary: "#e5e5e5",
  primaryForeground: "#171717",
  highlight: "#ffedd5", // orange-100
  destructive: "#f87171",
  success: "#4ade80",
  warning: "#fde047",
};

export const light: Palette = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  muted: "#737373",
  card: "#ffffff",
  cardFill: "rgba(255,255,255,0.70)",
  cardEdge: "rgba(120,53,15,0.15)",
  cardEdgeHover: "rgba(120,53,15,0.25)",
  border: "#e5e5e5",
  input: "#e5e5e5",
  primary: "#171717",
  primaryForeground: "#fafafa",
  highlight: "#854d0e", // yellow-800
  destructive: "#dc2626",
  success: "#15803d",
  warning: "#a16207",
};

export const radius = { sm: 6, md: 8, lg: 10, xl: 14 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Loaded in App.tsx with expo-font. Names match @expo-google-fonts exports. */
export const fonts = {
  sans: "Manrope_400Regular",
  sansMedium: "Manrope_500Medium",
  sansSemi: "Manrope_600SemiBold",
  display: "Montserrat_600SemiBold",
  displayMedium: "Montserrat_500Medium",
  brand: "Onest_500Medium",
} as const;
