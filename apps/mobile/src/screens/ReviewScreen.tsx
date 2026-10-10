import { useState } from "react";
import { Pressable, View } from "react-native";
import { formatClock } from "../round1/clock";
import { progress } from "../round1/state";
import type { Paper } from "../round1/types";
import { fonts, radius, useTheme } from "../theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

export function ReviewScreen({
  paper,
  answers,
  flagged,
  remainingMs,
  onGoto,
  onBack,
  onSubmit,
}: {
  paper: Paper;
  answers: Record<string, number>;
  flagged: string[];
  remainingMs: number;
  onGoto: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { palette } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const p = progress({ paper, answers, flagged });

  return (
    <Screen
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Back to test" variant="outline" onPress={onBack} style={{ flex: 1 }} />
          <Button label="Submit" variant="solid" onPress={() => setConfirming(true)} style={{ flex: 1.2 }} />
        </View>
      }
    >
      <View style={{ marginTop: 8, gap: 6 }}>
        <Text variant="h1" accessibilityRole="header">
          Review
        </Text>
        <Text muted>Time left: {formatClock(remainingMs)}. Tap a number to jump to that question.</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Chip label={`${p.answered} answered`} tone="success" />
        {p.unanswered > 0 && <Chip label={`${p.unanswered} unanswered`} tone="warning" />}
        {p.flagged > 0 && <Chip label={`${p.flagged} flagged`} />}
      </View>

      <Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {paper.questions.map((q, i) => {
            const done = answers[q.id] !== undefined;
            const isFlagged = flagged.includes(q.id);
            return (
              <Pressable
                key={q.id}
                onPress={() => onGoto(i)}
                accessibilityRole="button"
                accessibilityLabel={`Question ${i + 1}, ${done ? "answered" : "not answered"}${isFlagged ? ", flagged" : ""}`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: done ? palette.cardEdgeHover : palette.warning,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.sansSemi, color: done ? palette.foreground : palette.warning }}>{i + 1}</Text>
                {isFlagged && (
                  <Text accessibilityElementsHidden style={{ position: "absolute", top: 1, right: 5, fontSize: 11, color: palette.highlight }}>
                    {"•"}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <ConfirmDialog
        visible={confirming}
        title="Submit your answers?"
        body={
          p.unanswered > 0
            ? `You have ${p.unanswered} unanswered question${p.unanswered === 1 ? "" : "s"}. They will be marked as not answered. You cannot change anything after submitting.`
            : "You cannot change anything after submitting."
        }
        confirmLabel="Submit answers"
        cancelLabel="Keep working"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onSubmit();
        }}
      />
    </Screen>
  );
}
