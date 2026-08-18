import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../theme";

interface CollapsibleSectionProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  label,
  icon,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={styles.header}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={styles.label}>{label}</Text>
        <Ionicons
          name={open ? "chevron-down" : "chevron-forward"}
          size={14}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {open && <View>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  label: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
