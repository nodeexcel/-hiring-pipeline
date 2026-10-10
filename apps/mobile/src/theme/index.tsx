import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { dark, light, type Palette } from "./tokens";

interface Theme {
  palette: Palette;
  scheme: "dark" | "light";
}

const ThemeContext = createContext<Theme>({ palette: dark, scheme: "dark" });

/** Dark is the default, as in ChaiUI. The phone's light setting switches to the light palette. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const scheme = system === "light" ? "light" : "dark";
  const value = useMemo(() => ({ scheme, palette: scheme === "light" ? light : dark }) as Theme, [scheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export const useTheme = () => useContext(ThemeContext);
export * from "./tokens";
