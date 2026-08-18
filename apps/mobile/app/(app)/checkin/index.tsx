import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function CheckinScreen() {
  const { user } = useAuth();
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

  if (!user) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="person-outline"
          title="Sign in required"
          subtitle="Please sign in to access your check-in QR code"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <View style={styles.container}>
        {/* QR code placeholder card */}
        <View style={styles.qrCard}>
          <View style={styles.qrGradientHeader}>
            <Ionicons name="qr-code" size={24} color={colors.white} />
            <Text style={styles.qrHeaderText}>Event Check-in</Text>
          </View>

          <View style={styles.qrBody}>
            {/* QR code placeholder */}
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={120} color={colors.primary} />
            </View>

            <Text style={styles.userName}>
              {user.user_metadata?.full_name ??
                user.user_metadata?.first_name ??
                user.email}
            </Text>
            <Text style={styles.eventName}>{currentEvent.title}</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              Show this QR code at the registration desk
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              Staff will scan your code to check you in
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Your badge and materials will be provided
            </Text>
          </View>
        </View>

        {/* Info note */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            QR code generation will be available once check-in is enabled for this event. Keep the app ready for a smooth check-in experience.
          </Text>
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
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  qrGradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  qrHeaderText: {
    ...typography.h3,
    color: colors.white,
  },
  qrBody: {
    alignItems: "center",
    padding: spacing.xl,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: "dashed",
  },
  userName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  eventName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  instructionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    ...typography.captionBold,
    color: colors.primary,
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});
