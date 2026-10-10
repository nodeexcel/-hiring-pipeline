import { useState } from "react";
import { Pressable, View } from "react-native";
import { copy } from "../round1/copy";
import type { RulesInfo } from "../round1/types";
import { radius, useTheme } from "../theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

export function RulesScreen({ info, error, onAccept }: { info: RulesInfo; error: string | null; onAccept: () => void }) {
  const { palette } = useTheme();
  const [checked, setChecked] = useState(false);

  return (
    <Screen footer={<Button label="Accept and continue" variant="solid" disabled={!checked} onPress={onAccept} accessibilityHint="Downloads your paper" />}>
      <View style={{ marginTop: 16, gap: 8 }}>
        <Text variant="h1" accessibilityRole="header">
          {copy.rulesTitle}
        </Text>
        <Text muted>
          {info.firstName ? `Hi ${info.firstName}. ` : ""}
          {copy.rulesLead}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Chip label={`${info.questionCount} questions`} />
          <Chip label={`${info.durationMinutes} minutes`} />
        </View>
      </View>

      <Card style={{ gap: 14 }}>
        {info.rules.map((rule, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12 }}>
            <Text variant="label" muted style={{ width: 22 }}>
              {i + 1}.
            </Text>
            <Text style={{ flex: 1 }}>{rule}</Text>
          </View>
        ))}
      </Card>

      <Pressable
        onPress={() => setChecked((c) => !c)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={copy.rulesAccept}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.sm,
            borderWidth: 1.5,
            borderColor: checked ? palette.highlight : palette.input,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked && <Text style={{ color: palette.highlight, fontSize: 16, lineHeight: 20 }}>{"✓"}</Text>}
        </View>
        <Text style={{ flex: 1 }}>{copy.rulesAccept}</Text>
      </Pressable>

      {error && (
        <Text variant="small" accessibilityRole="alert" style={{ color: palette.destructive }}>
          {error}
        </Text>
      )}
    </Screen>
  );
}
