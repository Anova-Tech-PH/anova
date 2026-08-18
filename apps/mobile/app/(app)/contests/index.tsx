import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getContests } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

type ContestType = "photo" | "caption" | "icebreaker";

const TYPE_CONFIG: Record<ContestType, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  photo: { icon: "camera-outline", label: "Photo Contest" },
  caption: { icon: "chatbubble-outline", label: "Caption Contest" },
  icebreaker: { icon: "people-outline", label: "Icebreaker" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as ContestType] ?? { icon: "trophy-outline" as const, label: type };
}

function formatDateRange(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  const start = fmt(startsAt);
  if (!endsAt) return start;
  return `${start} — ${fmt(endsAt)}`;
}

export default function ContestsScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: contests = [], isLoading } = useQuery({
    queryKey: ["contests", currentEvent?.id],
    queryFn: () => getContests(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const filtered = useMemo(() => {
    if (!search) return contests;
    const q = search.toLowerCase();
    return contests.filter(
      (c: any) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [contests, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["contests"] });
    setRefreshing(false);
  };

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

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const renderContest = ({ item }: { item: any }) => {
    const config = getTypeConfig(item.type);
    const dateRange = formatDateRange(item.starts_at, item.ends_at);

    return (
      <TouchableOpacity
        style={styles.contestCard}
        onPress={() => router.push(`/(app)/contests/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={22} color={colors.primary} />
          </View>
          <Badge label={config.label} />
        </View>

        <Text style={styles.contestTitle} numberOfLines={1}>
          {item.title}
        </Text>

        {item.description && (
          <Text style={styles.contestDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {dateRange && (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.dateText}>{dateRange}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search contests..." />
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderContest}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="No contests found"
            subtitle={search ? "Try adjusting your search" : "No active contests for this event"}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  contestTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  contestDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    ...typography.small,
    color: colors.textMuted,
  },
});
