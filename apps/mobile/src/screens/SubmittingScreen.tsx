import { View } from "react-native";
import { copy } from "../round1/copy";
import { useTheme } from "../theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { Skeleton } from "../ui/Skeleton";
import { Text } from "../ui/Text";

/** Uploading, or waiting for the candidate to turn the internet back on. Answers are already safe. */
export function SubmittingScreen({ error, online, onRetry }: { error: string | null; online: boolean | null; onRetry: () => void }) {
  const { palette } = useTheme();
  return (
    <Screen footer={error ? <Button label="Try again" variant="solid" onPress={onRetry} /> : undefined}>
      <View style={{ marginTop: 28, gap: 12 }}>
        <Text variant="h1" accessibilityRole="header">
          {error ? "Almost done" : "Submitting"}
        </Text>
        <Text muted>{error ? copy.uploadHint : copy.timeUp.replace("Time is up. ", "")}</Text>
      </View>
      {error ? (
        <Card style={{ gap: 8 }}>
          <Text variant="label">{online ? "Internet is on. Tap Try again." : "Internet is off."}</Text>
          <Text variant="small" accessibilityRole="alert" style={{ color: palette.destructive }}>
            {error}
          </Text>
        </Card>
      ) : (
        <Card style={{ gap: 12 }} >
          <Skeleton width="60%" height={18} />
          <Skeleton height={14} />
          <Skeleton width="80%" height={14} />
        </Card>
      )}
    </Screen>
  );
}
