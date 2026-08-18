import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getScheduleData,
  getUserBookmarks,
  toggleSessionBookmark,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { Avatar } from "../../../src/components/avatar";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function getDayTabs(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const tabs: { key: string; label: string; date: string }[] = [];
  const d = new Date(start);
  let day = 1;
  while (d <= end) {
    tabs.push({
      key: d.toISOString().slice(0, 10),
      label: `Day ${day}`,
      date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    });
    d.setDate(d.getDate() + 1);
    day++;
  }
  return tabs;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [showMyAgenda, setShowMyAgenda] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["schedule", currentEvent?.id],
    queryFn: () => getScheduleData(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => getUserBookmarks(supabase, user!.id),
    enabled: !!user?.id,
  });

  const bookmarkMutation = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) =>
      toggleSessionBookmark(supabase, sessionId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const dayTabs = useMemo(() => {
    if (!data?.event) return [];
    return getDayTabs(data.event.start_date, data.event.end_date);
  }, [data?.event]);

  // Auto-select first day
  const selectedDay = activeDay ?? dayTabs[0]?.key ?? null;

  const filteredSessions = useMemo(() => {
    if (!data?.sessions) return [];
    let sessions = data.sessions as any[];

    // Filter by day
    if (selectedDay) {
      sessions = sessions.filter((s: any) => s.start_time?.slice(0, 10) === selectedDay);
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      sessions = sessions.filter(
        (s: any) =>
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      );
    }

    // Filter by bookmarks (My Agenda toggle)
    if (showMyAgenda) {
      sessions = sessions.filter((s: any) => bookmarkSet.has(s.id));
    }

    return sessions;
  }, [data?.sessions, selectedDay, search, showMyAgenda, bookmarkSet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["schedule"] });
    await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    setRefreshing(false);
  };

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="calendar-outline" title="Select an event" subtitle="Go to My Events to choose an event" />
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

  const renderSession = ({ item }: { item: any }) => {
    const tracks = (item.session_tracks ?? []).map((st: any) => st.tracks).filter(Boolean);
    const speakers = (item.session_speakers ?? []).map((ss: any) => ss.speakers).filter(Boolean);
    const isBookmarked = bookmarkSet.has(item.id);

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => router.push(`/(app)/schedule/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{formatTime(item.start_time)}</Text>
          <Text style={styles.endTimeText}>{formatTime(item.end_time)}</Text>
        </View>
        <View style={styles.sessionContent}>
          <Text style={styles.sessionTitle} numberOfLines={2}>{item.title}</Text>

          {/* Track badges */}
          {tracks.length > 0 && (
            <View style={styles.badgeRow}>
              {tracks.map((t: any) => (
                <Badge key={t.id} label={t.name} color={t.color || colors.primary} backgroundColor={`${t.color || colors.primary}20`} />
              ))}
              {item.type && item.type !== "session" && (
                <Badge label={item.type} />
              )}
            </View>
          )}

          {/* Speakers */}
          {speakers.length > 0 && (
            <View style={styles.speakerRow}>
              {speakers.slice(0, 3).map((sp: any) => (
                <View key={sp.id} style={styles.speakerChip}>
                  <Avatar name={sp.name} size={20} />
                  <Text style={styles.speakerName} numberOfLines={1}>{sp.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}
        </View>

        {/* Bookmark button */}
        {user && (
          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={() => bookmarkMutation.mutate({ sessionId: item.id })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={20}
              color={isBookmarked ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search sessions..." />

      {/* Filter row: Day select + Agenda toggle */}
      <View style={styles.filterRow}>
        {dayTabs.length > 1 && (
          <>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setDayPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.selectBtnText}>
                {dayTabs.find((d) => d.key === selectedDay)?.label ?? "Day"}{" "}
                <Text style={styles.selectBtnDate}>
                  {dayTabs.find((d) => d.key === selectedDay)?.date ?? ""}
                </Text>
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <Modal
              visible={dayPickerOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setDayPickerOpen(false)}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setDayPickerOpen(false)}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Day</Text>
                  {dayTabs.map((d) => {
                    const isSelected = d.key === selectedDay;
                    return (
                      <TouchableOpacity
                        key={d.key}
                        style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                        onPress={() => {
                          setActiveDay(d.key);
                          setDayPickerOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View>
                          <Text style={[styles.modalOptionLabel, isSelected && styles.modalOptionLabelActive]}>
                            {d.label}
                          </Text>
                          <Text style={[styles.modalOptionDate, isSelected && styles.modalOptionDateActive]}>
                            {d.date}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Pressable>
            </Modal>
          </>
        )}

        {user && (
          <TouchableOpacity
            style={[styles.toggleBtn, showMyAgenda && styles.toggleActive]}
            onPress={() => setShowMyAgenda(!showMyAgenda)}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark" size={14} color={showMyAgenda ? colors.white : colors.textSecondary} />
            <Text style={[styles.toggleText, showMyAgenda && styles.toggleTextActive]}>My Agenda</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredSessions}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSession}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={showMyAgenda ? "No bookmarked sessions" : "No sessions found"}
            subtitle={showMyAgenda ? "Bookmark sessions to add them to your agenda" : "Try adjusting your search or day filter"}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sessionCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  timeCol: {
    width: 60,
    paddingTop: 2,
  },
  timeText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  endTimeText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  speakerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  speakerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  speakerName: {
    ...typography.small,
    color: colors.textSecondary,
    maxWidth: 80,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    ...typography.small,
    color: colors.textMuted,
  },
  bookmarkBtn: {
    paddingLeft: spacing.sm,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  selectBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  selectBtnDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "400" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%" as const,
    maxWidth: 320,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  modalOptionActive: {
    backgroundColor: `${colors.primary}10`,
  },
  modalOptionLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  modalOptionLabelActive: {
    color: colors.primary,
  },
  modalOptionDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalOptionDateActive: {
    color: colors.primary,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.white,
  },
});
