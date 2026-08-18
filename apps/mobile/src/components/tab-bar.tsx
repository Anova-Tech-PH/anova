import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../theme";

interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function TabBar({ tabs, activeTab, onTabPress }: TabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
            activeOpacity={0.7}
          >
            {tab.label.includes("\n") ? (
              <>
                <Text style={[styles.tabLabel, isActive && styles.activeTabText]}>
                  {tab.label.split("\n")[0]}
                </Text>
                <Text style={[styles.tabSublabel, isActive && styles.activeTabSublabel]}>
                  {tab.label.split("\n")[1]}
                </Text>
              </>
            ) : (
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  tabSublabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeTabSublabel: {
    color: "rgba(255,255,255,0.8)",
  },
  tabText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.white,
  },
});
