import { View } from "react-native";
import { copy } from "../round1/copy";
import type { Paper } from "../round1/types";
import { useTheme } from "../theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { Screen } from "../ui/Screen";
import { Highlight, Text } from "../ui/Text";

/** The offline gate: the test will not start while the phone is online. */
export function ReadyScreen({ paper, online, error, onStart }: { paper: Paper; online: boolean | null; error: string | null; onStart: () => void }) {
  const { palette } = useTheme();
  const offline = online === false;

  return (
    <Screen footer={<Button label="Start test" variant="solid" disabled={!offline} onPress={onStart} accessibilityHint="The timer starts immediately" />}>
      <View style={{ marginTop: 20, gap: 8 }}>
        <Text variant="h1" accessibilityRole="header">
          {copy.readyTitle}
        </Text>
        <Text muted>
          Your paper is saved on this device. The timer starts the moment you tap <Highlight>Start test</Highlight>.
        </Text>
      </View>

      <Card style={{ gap: 12 }}>
        <Text variant="title">{paper.questions.length} questions</Text>
        <Text muted>{paper.durationMinutes} minutes, one attempt.</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip label={online === null ? "Checking connection" : offline ? "Internet is off" : "Internet is on"} tone={online === null ? "default" : offline ? "success" : "warning"} />
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text variant="label">{offline ? copy.offlineOk : "Turn your internet off"}</Text>
        {!offline && (
          <View style={{ gap: 4 }}>
            <Text variant="small" muted>
              1. Swipe down from the top of the screen.
            </Text>
            <Text variant="small" muted>
              2. Turn off Wi-Fi and mobile data, or switch on airplane mode.
            </Text>
            <Text variant="small" muted>
              3. Come back here. This screen updates by itself.
            </Text>
          </View>
        )}
      </Card>

      {error && (
        <Text variant="small" accessibilityRole="alert" style={{ color: palette.destructive }}>
          {error}
        </Text>
      )}
    </Screen>
  );
}
