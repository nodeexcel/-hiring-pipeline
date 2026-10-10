import { Pressable, View } from "react-native";
import { formatClock } from "../round1/clock";
import type { Paper } from "../round1/types";
import { fonts, radius, useTheme } from "../theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function TestScreen({
  paper,
  answers,
  flagged,
  index,
  remainingMs,
  onAnswer,
  onClear,
  onFlag,
  onGoto,
  onReview,
}: {
  paper: Paper;
  answers: Record<string, number>;
  flagged: string[];
  index: number;
  remainingMs: number;
  onAnswer: (questionId: string, option: number) => void;
  onClear: (questionId: string) => void;
  onFlag: (questionId: string) => void;
  onGoto: (index: number) => void;
  onReview: () => void;
}) {
  const { palette } = useTheme();
  const q = paper.questions[index];
  const total = paper.questions.length;
  const chosen = answers[q.id];
  const isFlagged = flagged.includes(q.id);
  const last = index === total - 1;
  const answered = Object.keys(answers).length;
  const timerColor = remainingMs < 60_000 ? palette.destructive : remainingMs < 5 * 60_000 ? palette.warning : palette.foreground;

  return (
    <Screen
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Previous" variant="outline" disabled={index === 0} onPress={() => onGoto(index - 1)} style={{ flex: 1 }} />
          {last ? (
            <Button label="Review answers" variant="solid" onPress={onReview} style={{ flex: 1.4 }} />
          ) : (
            <Button label="Next" variant="solid" onPress={() => onGoto(index + 1)} style={{ flex: 1.4 }} />
          )}
        </View>
      }
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="label" muted accessibilityLiveRegion="polite">
          Question {index + 1} of {total}
        </Text>
        <Text accessibilityRole="timer" accessibilityLabel={`Time remaining ${formatClock(remainingMs)}`} style={{ color: timerColor, fontFamily: fonts.display, fontSize: 18 }}>
          {formatClock(remainingMs)}
        </Text>
      </View>

      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: answered }} style={{ height: 3, borderRadius: 2, backgroundColor: palette.border }}>
        <View style={{ height: 3, borderRadius: 2, width: `${(answered / total) * 100}%`, backgroundColor: palette.foreground }} />
      </View>

      <Card style={{ gap: 6 }}>
        <Text variant="small" muted>
          {q.topic}
        </Text>
        <Text style={{ fontSize: 18, lineHeight: 27 }} accessibilityRole="header">
          {q.body}
        </Text>
      </Card>

      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {q.options.map((option, i) => {
          const selected = chosen === i;
          return (
            <Pressable
              key={i}
              onPress={() => onAnswer(q.id, i)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Option ${LETTERS[i]}: ${option}`}
              style={({ pressed }) => ({
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                minHeight: 56,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: selected ? palette.cardEdgeHover : palette.cardEdge,
                backgroundColor: selected ? palette.card : palette.cardFill,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: selected ? palette.highlight : palette.input,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="small" style={{ color: selected ? palette.highlight : palette.muted, fontFamily: fonts.sansSemi }}>
                  {LETTERS[i]}
                </Text>
              </View>
              <Text style={{ flex: 1 }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label={isFlagged ? "Remove flag" : "Flag for review"} variant="ghost" onPress={() => onFlag(q.id)} />
        {chosen !== undefined && <Button label="Clear answer" variant="ghost" onPress={() => onClear(q.id)} />}
        <View style={{ flex: 1 }} />
        <Button label="Overview" variant="ghost" onPress={onReview} />
      </View>
    </Screen>
  );
}
