import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "../../../src/components/empty-state";
import { useEventContext } from "../../../src/lib/event-context";
import { shared } from "../../../src/theme";

export default function PassportScreen() {
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
        icon="compass-outline"
        title="Passport coming soon"
        subtitle="Collect stamps by visiting booths and completing activities. Your digital passport will track your journey!"
      />
    </SafeAreaView>
  );
}
