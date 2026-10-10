import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, radius, useTheme } from "../theme";
import { Text } from "./Text";

type Variant = "solid" | "outline" | "soft" | "ghost";

/**
 * ChaiUI buttons. `solid` is the one main action on a screen: white on dark, with asymmetric
 * corners (top right and bottom left rounded). `outline` mirrors them and sits beside it.
 */
export function Button({
  label,
  onPress,
  variant = "soft",
  disabled,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { palette, scheme } = useTheme();
  const solidBg = scheme === "dark" ? "#ffffff" : "#171717";
  const solidFg = scheme === "dark" ? "#000000" : "#ffffff";

  const corners =
    variant === "solid"
      ? { borderTopLeftRadius: 0, borderTopRightRadius: radius.lg, borderBottomRightRadius: 0, borderBottomLeftRadius: radius.lg }
      : variant === "outline"
        ? { borderTopLeftRadius: radius.lg, borderTopRightRadius: 0, borderBottomRightRadius: radius.lg, borderBottomLeftRadius: 0 }
        : { borderRadius: radius.md };

  const look: ViewStyle =
    variant === "solid"
      ? { backgroundColor: solidBg }
      : variant === "outline"
        ? { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.input }
        : variant === "soft"
          ? { backgroundColor: palette.primary }
          : { backgroundColor: "transparent" };
  const fg = variant === "solid" ? solidFg : variant === "soft" ? palette.primaryForeground : palette.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.base, corners, look, { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, style]}
    >
      <View style={styles.row}>
        <Text style={{ color: fg, fontFamily: variant === "soft" ? fonts.sansSemi : fonts.sansMedium, fontSize: 15 }}>{label}</Text>
        {variant === "solid" && (
          <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: fg, fontSize: 15 }}>
            {" ↗"}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, paddingHorizontal: 20, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
});
