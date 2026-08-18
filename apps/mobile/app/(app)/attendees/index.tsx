import React, { useState, useMemo, useCallback } from "react";
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
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getEventAttendees,
  getAttendeeBookmarkIds,
  toggleAttendeeBookmark,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

type Tab = "all" | "bookmarked";

const PAGE_SIZE = 30;

export default function AttendeesScreen() {
  const { currentEvent } = useEventContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["attendees", currentEvent?.id],
    queryFn: () => getEventAttendees(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: bookmarkedIds = [] } = useQuery({
    queryKey: ["attendee-bookmarks", currentEvent?.id, user?.id],
    queryFn: () => getAttendeeBookmarkIds(supabase, user!.id, currentEvent!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const bookmarkSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const bookmarkMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      toggleAttendeeBookmark(supabase, user!.id, targetUserId, currentEvent!.id),
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ["attendee-bookmarks", currentEvent?.id, user?.id] });
      const prev = queryClient.getQueryData<string[]>(["attendee-bookmarks", currentEvent?.id, user?.id]) ?? [];
      const next = prev.includes(targetUserId)
        ? prev.filter((id) => id !== targetUserId)
        : [...prev, targetUserId];
      queryClient.setQueryData(["attendee-bookmarks", currentEvent?.id, user?.id], next);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["attendee-bookmarks", currentEvent?.id, user?.id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendee-bookmarks", currentEvent?.id, user?.id] });
    },
  });

  const filtered = useMemo(() => {
    let list = attendees.filter((a: any) => a.full_name);

    if (tab === "bookmarked") {
      list = list.filter((a: any) => bookmarkSet.has(a.id));
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a: any) =>
          a.full_name?.toLowerCase().includes(q) ||
          a.title?.toLowerCase().includes(q) ||
          a.company?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [attendees, search, tab, bookmarkSet]);

  const paginatedData = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendees"] }),
      queryClient.invalidateQueries({ queryKey: ["attendee-bookmarks"] }),
    ]);
    setRefreshing(false);
  };

  const onEndReached = useCallback(() => {
    if (visibleCount < filtered.length) {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
    }
  }, [visibleCount, filtered.length]);

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

  const renderAttendee = ({ item }: { item: any }) => {
    const isBookmarked = bookmarkSet.has(item.id);
    const isOwnProfile = user?.id === item.id;

    return (
      <TouchableOpacity
        style={styles.attendeeCard}
        onPress={() => router.push(`/(app)/attendees/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <Avatar name={item.full_name} size={48} uri={item.avatar_url} />
        <View style={styles.attendeeInfo}>
          <Text style={styles.attendeeName} numberOfLines={1}>
            {item.full_name}
          </Text>
          {item.title && (
            <Text style={styles.attendeeTitle} numberOfLines={1}>
              {item.title}
            </Text>
          )}
          {item.company && (
            <View style={styles.companyRow}>
              <Ionicons name="business-outline" size={12} color={colors.textMuted} />
              <Text style={styles.attendeeCompany} numberOfLines={1}>
                {item.company}
              </Text>
            </View>
          )}
        </View>
        {!isOwnProfile && user && (
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={(e) => {
              e.stopPropagation?.();
              bookmarkMutation.mutate(item.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isBookmarked ? "star" : "star-outline"}
              size={22}
              color={isBookmarked ? colors.warning : colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search attendees..." />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["all", "bookmarked"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => {
              setTab(t);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            {t === "bookmarked" && (
              <Ionicons
                name="star"
                size={14}
                color={tab === t ? colors.primary : colors.textMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "all" ? `All (${attendees.filter((a: any) => a.full_name).length})` : `Bookmarked (${bookmarkedIds.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={paginatedData}
        keyExtractor={(item: any) => item.id}
        renderItem={renderAttendee}
        contentContainerStyle={shared.listContent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={tab === "bookmarked" ? "star-outline" : "people-outline"}
            title={tab === "bookmarked" ? "No bookmarked attendees" : "No attendees found"}
            subtitle={
              tab === "bookmarked"
                ? "Tap the star icon on attendee cards to bookmark them"
                : "Try adjusting your search"
            }
          />
        }
        ListFooterComponent={
          visibleCount < filtered.length ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ paddingVertical: spacing.lg }}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  attendeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  attendeeInfo: {
    flex: 1,
    gap: 2,
  },
  attendeeName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  attendeeTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attendeeCompany: {
    ...typography.small,
    color: colors.textMuted,
  },
  bookmarkButton: {
    padding: spacing.xs,
  },
});
