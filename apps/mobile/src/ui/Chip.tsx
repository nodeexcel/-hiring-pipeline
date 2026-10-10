import { View } from "react-native";
import { useTheme } from "../theme";
import { Text } from "./Text";

/** Outlined meta chip. Colour is text and a thin stroke, never a fill. */
export function Chip({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "danger" | "warning" }) {
  const { palette } = useTheme();
  const color = tone === "success" ? palette.success : tone === "danger" ? palette.destructive : tone === "warning" ? palette.warning : palette.muted;
  return (
    <View style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: color, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, opacity: 0.95 }}>
      <Text variant="small" style={{ color, fontSize: 12, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}
