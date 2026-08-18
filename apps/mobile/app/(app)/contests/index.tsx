import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "../../../src/components/empty-state";
import { useEventContext } from "../../../src/lib/event-context";
import { shared } from "../../../src/theme";

export default function ContestsScreen() {
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
        icon="camera-outline"
        title="Contests coming soon"
        subtitle="Photo and video contests will be available here. Stay tuned for exciting competitions!"
      />
    </SafeAreaView>
  );
}
