import { View, type StyleProp, type ViewStyle } from "react-native";
import { radius, useTheme } from "../theme";

/** Warm hairline card: faint fill, thin warm border, no shadow. */
export function Card({ children, style, selected }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; selected?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: selected ? palette.cardEdgeHover : palette.cardEdge,
          backgroundColor: palette.cardFill,
          borderRadius: radius.xl,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
