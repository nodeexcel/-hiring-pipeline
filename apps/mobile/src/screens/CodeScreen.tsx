import { useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { copy } from "../round1/copy";
import { fonts, radius, useTheme } from "../theme";
import { Button } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { Highlight, Text } from "../ui/Text";

export function CodeScreen({ code, error, onChange, onContinue }: { code: string; error: string | null; onChange: (v: string) => void; onContinue: () => Promise<void> }) {
  const { palette } = useTheme();
  const [busy, setBusy] = useState(false);
  const ready = code.length >= 6 && !busy;

  const go = async () => {
    setBusy(true);
    await onContinue();
    setBusy(false);
  };

  return (
    <Screen
      footer={
        busy ? (
          <ActivityIndicator color={palette.foreground} accessibilityLabel="Checking your code" />
        ) : (
          <Button label="Continue" variant="solid" disabled={!ready} onPress={go} />
        )
      }
    >
      <View style={{ marginTop: 28, gap: 6 }}>
        <Text variant="brand" muted>
          {copy.appName}
        </Text>
        <Text variant="h1" accessibilityRole="header">
          {copy.codeTitle}
        </Text>
      </View>
      <Text muted>
        Enter the invite code from your email. You need internet for <Highlight>this step only</Highlight>.
      </Text>

      <View style={{ gap: 8, marginTop: 8 }}>
        <Text variant="label">Invite code</Text>
        <TextInput
          value={code}
          onChangeText={onChange}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          placeholder="For example 1F43C43699"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Invite code"
          onSubmitEditing={() => ready && void go()}
          returnKeyType="go"
          style={{
            minHeight: 52,
            borderWidth: 1,
            borderColor: error ? palette.destructive : palette.input,
            borderRadius: radius.lg,
            paddingHorizontal: 14,
            color: palette.foreground,
            fontFamily: fonts.sansMedium,
            fontSize: 18,
            letterSpacing: 2,
            backgroundColor: palette.cardFill,
          }}
        />
        {error ? (
          <Text variant="small" accessibilityRole="alert" style={{ color: palette.destructive }}>
            {error}
          </Text>
        ) : (
          <Text variant="small" muted>
            {copy.codeHint}
          </Text>
        )}
      </View>
    </Screen>
  );
}
