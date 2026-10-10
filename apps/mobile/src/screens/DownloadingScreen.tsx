import { View } from "react-native";
import { copy } from "../round1/copy";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { Skeleton } from "../ui/Skeleton";
import { Text } from "../ui/Text";

/** Shown while the encrypted paper downloads. Shaped like the Ready screen it leads to. */
export function DownloadingScreen() {
  return (
    <Screen>
      <View accessibilityRole="progressbar" accessibilityLabel={copy.downloading} style={{ gap: 16, marginTop: 28 }}>
        <Text variant="h1">{copy.downloading}</Text>
        <Text muted>This takes a few seconds. Keep the app open.</Text>
        <Card style={{ gap: 12 }}>
          <Skeleton width="55%" height={20} />
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton width="70%" height={14} />
        </Card>
        <Skeleton height={48} />
      </View>
    </Screen>
  );
}
