import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function CertificateScreen() {
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
        {/* Certificate preview card */}
        <View style={styles.certificateCard}>
          <View style={styles.certificateGradient}>
            <Ionicons name="ribbon" size={48} color="rgba(255,255,255,0.3)" />
          </View>

          <View style={styles.certificateBody}>
            <Text style={styles.certLabel}>Certificate of Attendance</Text>
            <Text style={styles.certEvent}>{currentEvent.title}</Text>
            <View style={styles.certDivider} />
            <Text style={styles.certDate}>
              {new Date(currentEvent.start_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Info message */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Certificates will be available for download after the event concludes. Check back once the event has ended to claim your certificate of attendance.
            </Text>
          </View>
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
  certificateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  certificateGradient: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  certificateBody: {
    padding: spacing.xl,
    alignItems: "center",
  },
  certLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  certEvent: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  certDivider: {
    width: 60,
    height: 2,
    backgroundColor: colors.primary,
    marginVertical: spacing.lg,
  },
  certDate: {
    ...typography.body,
    color: colors.textSecondary,
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
});
