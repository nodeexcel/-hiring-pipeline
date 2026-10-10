import { View } from "react-native";
import { copy } from "../round1/copy";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { Highlight, Text } from "../ui/Text";

export function DoneScreen() {
  return (
    <Screen>
      <View style={{ marginTop: 56, gap: 12 }}>
        <Text variant="h1" accessibilityRole="header">
          {copy.doneTitle}
        </Text>
        <Text muted>
          Your answers were submitted. The hiring team will contact you about <Highlight>next steps</Highlight>.
        </Text>
      </View>
      <Card>
        <Text variant="small" muted>
          You can close the app now. Your results are not shown here.
        </Text>
      </Card>
    </Screen>
  );
}
