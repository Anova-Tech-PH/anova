import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../theme";

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
}

export function Badge({ label, color = colors.primary, backgroundColor = colors.primaryMuted }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

interface CountBadgeProps {
  count: number;
  variant?: "alert" | "muted";
}

export function CountBadge({ count, variant = "alert" }: CountBadgeProps) {
  if (count <= 0) return null;
  const isAlert = variant === "alert";
  return (
    <View style={[styles.countBadge, isAlert ? styles.alertBg : styles.mutedBg]}>
      <Text style={[styles.countText, isAlert ? styles.alertText : styles.mutedText]}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.small,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 10,
    fontWeight: "600",
  },
  alertBg: { backgroundColor: colors.error },
  alertText: { color: colors.white },
  mutedBg: { backgroundColor: colors.border },
  mutedText: { color: colors.textSecondary },
});
