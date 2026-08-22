import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";

import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function CertificateScreen() {
  const navigation = useNavigation();
  const { currentEvent } = useEventContext();

  const renderContent = () => {
    if (!currentEvent) {
      return (
        <View style={shared.centered}>
          <EmptyState
            icon="calendar-outline"
            title="Select an event"
            subtitle="Go to My Events to choose an event"
          />
        </View>
      );
    }

    return (
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
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Custom Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.pageTitle}>Certificate</Text>
      </View>
      {renderContent()}
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
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  menuBtn: {
    padding: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
