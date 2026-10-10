import { Component, type ReactNode } from "react";
import { View } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { Text } from "./Text";

/**
 * Last line of defence: an unexpected render error shows a calm screen instead of a crash.
 * Answers are saved on every change, so "Reload" restores the session where it was.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReload: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0a0a0a" }}>
        <Card style={{ gap: 12 }}>
          <Text variant="title" style={{ color: "#fafafa" }}>
            Something went wrong
          </Text>
          <Text style={{ color: "#a3a3a3" }}>Your answers are saved on this device. Reload to carry on where you left off.</Text>
          <Button
            label="Reload"
            variant="solid"
            onPress={() => {
              this.setState({ failed: false });
              this.props.onReload();
            }}
          />
        </Card>
      </View>
    );
  }
}
