import { Modal, Pressable, View } from "react-native";
import { radius, useTheme } from "../theme";
import { Button } from "./Button";
import { Text } from "./Text";

/**
 * Says exactly what will happen. The safe choice comes first so it is focused first by
 * screen readers and sits where a thumb lands by default.
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        accessibilityLabel="Close dialog"
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={() => undefined}
          style={{ backgroundColor: palette.card, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.cardEdgeHover, padding: 20, gap: 12 }}
        >
          <Text variant="title">{title}</Text>
          <Text muted>{body}</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button label={cancelLabel} variant="outline" onPress={onCancel} />
            <Button label={confirmLabel} variant="solid" onPress={onConfirm} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
