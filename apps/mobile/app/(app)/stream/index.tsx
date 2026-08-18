import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function LiveStreamScreen() {
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
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <View style={styles.container}>
        {/* Placeholder for stream area */}
        <View style={styles.streamPlaceholder}>
          <Ionicons name="videocam" size={48} color={colors.textMuted} />
          <Text style={styles.placeholderTitle}>Live Stream</Text>
          <Text style={styles.placeholderSubtitle}>
            No live streams are currently active
          </Text>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              When a live stream begins, it will appear here automatically. Make sure you have a stable internet connection for the best viewing experience.
            </Text>
          </View>
        </View>

        {/* Status indicator */}
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Waiting for stream to start</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  streamPlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.black,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadows.md,
  },
  placeholderTitle: {
    ...typography.h3,
    color: colors.white,
  },
  placeholderSubtitle: {
    ...typography.caption,
    color: "rgba(255,255,255,0.6)",
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  statusText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
