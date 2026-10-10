import { useFonts } from "expo-font";
// Deep imports so only the weights the app uses are bundled, not every weight of every family.
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Montserrat_500Medium } from "@expo-google-fonts/montserrat/500Medium";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Onest_500Medium } from "@expo-google-fonts/onest/500Medium";
import { useEffect, useState } from "react";
import { useRound1 } from "./round1/useRound1";
import { CodeScreen } from "./screens/CodeScreen";
import { DoneScreen } from "./screens/DoneScreen";
import { DownloadingScreen } from "./screens/DownloadingScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { RulesScreen } from "./screens/RulesScreen";
import { SubmittingScreen } from "./screens/SubmittingScreen";
import { TestScreen } from "./screens/TestScreen";
import { ThemeProvider } from "./theme";
import { ErrorBoundary } from "./ui/ErrorBoundary";

function Round1() {
  const r = useRound1();
  const { state } = r;

  switch (state.phase) {
    case "boot":
      return <DownloadingScreen />;
    case "code":
      return (
        <CodeScreen
          code={state.code}
          error={state.error}
          onChange={(code) => r.dispatch({ type: "CODE_CHANGED", code })}
          onContinue={() => r.loadRules(state.code)}
        />
      );
    case "rules":
      return state.info ? <RulesScreen info={state.info} error={state.error} onAccept={r.acceptRules} /> : null;
    case "downloading":
      return <DownloadingScreen />;
    case "ready":
      return state.paper ? <ReadyScreen paper={state.paper} online={r.online} error={state.error} onStart={r.start} /> : null;
    case "test":
      return state.paper ? (
        <TestScreen
          paper={state.paper}
          answers={state.answers}
          flagged={state.flagged}
          index={state.index}
          remainingMs={r.remainingMs}
          onAnswer={(questionId, option) => r.dispatch({ type: "ANSWERED", questionId, option })}
          onClear={(questionId) => r.dispatch({ type: "CLEARED", questionId })}
          onFlag={(questionId) => r.dispatch({ type: "FLAG_TOGGLED", questionId })}
          onGoto={(index) => r.dispatch({ type: "GOTO", index })}
          onReview={() => r.dispatch({ type: "REVIEW_OPENED" })}
        />
      ) : null;
    case "review":
      return state.paper ? (
        <ReviewScreen
          paper={state.paper}
          answers={state.answers}
          flagged={state.flagged}
          remainingMs={r.remainingMs}
          onGoto={(index) => r.dispatch({ type: "GOTO", index })}
          onBack={() => r.dispatch({ type: "REVIEW_CLOSED" })}
          onSubmit={r.submit}
        />
      ) : null;
    case "submitting":
      return <SubmittingScreen error={state.error} online={r.online} onRetry={r.retryUpload} />;
    case "done":
      return <DoneScreen />;
  }
}

export default function App() {
  const [loaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Montserrat_500Medium, Montserrat_600SemiBold, Onest_500Medium });
  // never hold a candidate on a blank screen: fall back to system fonts after a moment
  const [giveUp, setGiveUp] = useState(false);
  // bumping the key remounts the app, which restores the saved session from storage
  const [session, setSession] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setGiveUp(true), 3000);
    return () => clearTimeout(id);
  }, []);
  if (!loaded && !giveUp) return null;

  return (
    <ThemeProvider>
      <ErrorBoundary onReload={() => setSession((n) => n + 1)}>
        <Round1 key={session} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
