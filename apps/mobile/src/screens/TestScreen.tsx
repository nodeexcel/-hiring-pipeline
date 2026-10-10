import { Animated, View } from "react-native";
import { formatClock } from "../round1/clock";
import type { Paper } from "../round1/types";
import { fonts, radius, useTheme } from "../theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Reveal, PressableScale, useTween } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** One answer option. Border, fill and the letter badge ease between states instead of snapping. */
function Option({ letter, text, selected, onPress }: { letter: string; text: string; selected: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  const t = useTween(selected ? 1 : 0);
  const mix = (a: string, b: string) => t.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Option ${letter}: ${text}`}
      scaleTo={0.985}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
          minHeight: 56,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: mix(palette.cardEdge, palette.highlight),
          backgroundColor: mix(palette.cardFill, palette.card),
        }}
      >
        <Animated.View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: mix(palette.input, palette.highlight),
            backgroundColor: mix("rgba(0,0,0,0)", palette.highlight),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: mix(palette.muted, palette.background) }}>{letter}</Animated.Text>
        </Animated.View>
        <Text style={{ flex: 1 }}>{text}</Text>
      </Animated.View>
    </PressableScale>
  );
}

/** Progress that glides to its new width when an answer is given. */
function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const { palette } = useTheme();
  const t = useTween(total ? answered / total : 0, 300);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: answered }} style={{ height: 3, borderRadius: 2, backgroundColor: palette.border, overflow: "hidden" }}>
      <Animated.View style={{ height: 3, borderRadius: 2, backgroundColor: palette.foreground, width: t.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
    </View>
  );
}

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

      <ProgressBar answered={answered} total={total} />

      <Reveal trigger={q.id}>
        <Card style={{ gap: 6 }}>
          <Text variant="small" muted>
            {q.topic}
          </Text>
          <Text style={{ fontSize: 18, lineHeight: 27 }} accessibilityRole="header">
            {q.body}
          </Text>
        </Card>
      </Reveal>

      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {q.options.map((option, i) => (
          <Reveal key={`${q.id}-${i}`} trigger={q.id} delay={60 + i * 45}>
            <Option letter={LETTERS[i]} text={option} selected={chosen === i} onPress={() => onAnswer(q.id, i)} />
          </Reveal>
        ))}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Button compact label={isFlagged ? "Unflag" : "Flag"} variant="ghost" onPress={() => onFlag(q.id)} accessibilityHint="Marks this question to look at again before you submit" />
        {chosen !== undefined && <Button compact label="Clear" variant="ghost" onPress={() => onClear(q.id)} accessibilityHint="Removes your answer to this question" />}
        <View style={{ flex: 1 }} />
        <Button compact label="Overview" variant="ghost" onPress={onReview} />
      </View>
    </Screen>
  );
}
