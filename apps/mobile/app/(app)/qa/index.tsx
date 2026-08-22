import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { getSessionsWithQA } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shared } from "../../../src/theme";

function formatSessionTime(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr} ${startTime} - ${endTime}`;
}

export default function SessionQAListScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions-with-qa", currentEvent?.id, search],
    queryFn: () =>
      getSessionsWithQA(supabase, currentEvent!.id, {
        search: search || undefined,
      }),
    enabled: !!currentEvent?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sessions-with-qa"] });
    setRefreshing(false);
  };

  const header = (
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
      <Text style={styles.pageTitle}>{currentEvent?.title ?? "Q&A"} — Q&A</Text>
      <Text style={styles.pageSubtitle}>
        Ask questions and upvote the ones you want answered.
      </Text>
    </View>
  );

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <EmptyState
            icon="calendar-outline"
            title="Select an event"
            subtitle="Go to My Events to choose an event"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const items = sessions ?? [];

  const renderSession = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => router.push(`/(app)/qa/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionRow}>
        <View style={styles.sessionContent}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.sessionTime}>
            {formatSessionTime(item.start_time, item.end_time)}
          </Text>
        </View>
        <View style={styles.countCol}>
          <Ionicons name="help-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.questionCount}>{item.question_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Section header */}
      {items.length > 0 && (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>All Sessions</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="help-circle-outline"
            title={search ? "No sessions found" : "No Q&A sessions"}
            subtitle={search ? "Try a different search term" : "Sessions with Q&A enabled will appear here"}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
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
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Search
  searchRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 8,
  },

  // Section header
  sectionHeaderRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Session card
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionContent: {
    flex: 1,
    minWidth: 0,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  countCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: spacing.md,
  },
  questionCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
