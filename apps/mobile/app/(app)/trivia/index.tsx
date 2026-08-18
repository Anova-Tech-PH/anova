import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "../../../src/components/empty-state";
import { useEventContext } from "../../../src/lib/event-context";
import { shared } from "../../../src/theme";

export default function TriviaScreen() {
  const { currentEvent } = useEventContext();

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="calendar-outline"
          title="Select an event"
          subtitle="Go to My Events to choose an event"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shared.centered} edges={["bottom"]}>
      <EmptyState
        icon="bulb-outline"
        title="Trivia coming soon"
        subtitle="Live trivia games and quizzes will be available here. Test your knowledge and compete with other attendees!"
      />
    </SafeAreaView>
  );
}
