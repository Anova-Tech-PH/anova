import React, { useState, useMemo } from "react";
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
  getSpeakersWithSessions,
  getScheduleData,
  getUserSpeakerBookmarks,
  toggleSpeakerBookmark,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
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

export default function SpeakersScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [trackPickerOpen, setTrackPickerOpen] = useState(false);
  const [showBookmarked, setShowBookmarked] = useState(false);

  const { data: speakers = [], isLoading } = useQuery({
    queryKey: ["speakers-with-sessions", currentEvent?.id],
    queryFn: () => getSpeakersWithSessions(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ["schedule", currentEvent?.id],
    queryFn: () => getScheduleData(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: bookmarkedIds = [] } = useQuery({
    queryKey: ["speaker-bookmarks", currentEvent?.id, user?.id],
    queryFn: () => getUserSpeakerBookmarks(supabase, user!.id, currentEvent!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const bookmarkMutation = useMutation({
    mutationFn: ({ speakerId }: { speakerId: string }) =>
      toggleSpeakerBookmark(supabase, user!.id, speakerId, currentEvent!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speaker-bookmarks"] });
    },
  });

  const bookmarkSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const dayTabs = useMemo(() => {
    if (!scheduleData?.event) return [];
    return getDayTabs(scheduleData.event.start_date, scheduleData.event.end_date);
  }, [scheduleData?.event]);

  // Extract unique tracks from speakers' sessions
  const tracks = useMemo(() => {
    const trackMap = new Map<string, { id: string; name: string; color: string }>();
    speakers.forEach((s: any) => {
      (s.session_speakers ?? []).forEach((ss: any) => {
        const session = ss.sessions;
        if (!session) return;
        (session.session_tracks ?? []).forEach((st: any) => {
          const t = st.tracks;
          if (t && !trackMap.has(t.id)) {
            trackMap.set(t.id, t);
          }
        });
      });
    });
    return Array.from(trackMap.values());
  }, [speakers]);

  const filtered = useMemo(() => {
    let result = speakers as any[];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q) ||
          s.company?.toLowerCase().includes(q)
      );
    }

    // Day filter - speakers presenting on that day
    if (selectedDay) {
      result = result.filter((s: any) =>
        (s.session_speakers ?? []).some((ss: any) =>
          ss.sessions?.start_time?.slice(0, 10) === selectedDay
        )
      );
    }

    // Track filter - speakers presenting in that track
    if (selectedTrack) {
      result = result.filter((s: any) =>
        (s.session_speakers ?? []).some((ss: any) =>
          (ss.sessions?.session_tracks ?? []).some(
            (st: any) => st.tracks?.id === selectedTrack
          )
        )
      );
    }

    // Bookmarked filter
    if (showBookmarked) {
      result = result.filter((s: any) => bookmarkSet.has(s.id));
    }

    return result;
  }, [speakers, search, selectedDay, selectedTrack, showBookmarked, bookmarkSet]);

  const hasFilters = !!selectedDay || !!selectedTrack || showBookmarked;

  const clearFilters = () => {
    setSelectedDay(null);
    setSelectedTrack(null);
    setShowBookmarked(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["speakers-with-sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["speaker-bookmarks"] }),
      queryClient.invalidateQueries({ queryKey: ["schedule"] }),
    ]);
    setRefreshing(false);
  };

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="mic-outline" title="Select an event" subtitle="Go to My Events to choose an event" />
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

  const renderSpeaker = ({ item }: { item: any }) => {
    const isBookmarked = bookmarkSet.has(item.id);
    return (
      <TouchableOpacity
        style={styles.speakerCard}
        onPress={() => router.push(`/(app)/speakers/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {/* Bookmark indicator */}
        {user && (
          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={() => bookmarkMutation.mutate({ speakerId: item.id })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isBookmarked ? "star" : "star-outline"}
              size={18}
              color={isBookmarked ? colors.warning : colors.textMuted}
            />
          </TouchableOpacity>
        )}
        <Avatar name={item.name} size={56} uri={item.photo} />
        <View style={styles.speakerInfo}>
          <Text style={styles.speakerName} numberOfLines={1}>{item.name}</Text>
          {item.title && (
            <Text style={styles.speakerTitle} numberOfLines={1}>{item.title}</Text>
          )}
          {item.company && (
            <Text style={styles.speakerCompany} numberOfLines={1}>{item.company}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search speakers..." />

      {/* Filter row */}
      <View style={styles.filterRow}>
        {/* Day filter */}
        {dayTabs.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.selectBtn, selectedDay && styles.selectBtnActive]}
              onPress={() => setDayPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={14} color={selectedDay ? colors.white : colors.primary} />
              <Text style={[styles.selectBtnText, selectedDay && styles.selectBtnTextActive]}>
                {selectedDay
                  ? dayTabs.find((d) => d.key === selectedDay)?.label ?? "Day"
                  : "Day"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedDay ? colors.white : colors.textMuted} />
            </TouchableOpacity>

            <Modal visible={dayPickerOpen} transparent animationType="fade" onRequestClose={() => setDayPickerOpen(false)}>
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
                          setSelectedDay(isSelected ? null : d.key);
                          setDayPickerOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View>
                          <Text style={[styles.modalOptionLabel, isSelected && styles.modalOptionLabelActive]}>{d.label}</Text>
                          <Text style={[styles.modalOptionDate, isSelected && styles.modalOptionDateActive]}>{d.date}</Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Pressable>
            </Modal>
          </>
        )}

        {/* Track filter */}
        {tracks.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.selectBtn, selectedTrack && styles.selectBtnActive]}
              onPress={() => setTrackPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="git-branch-outline" size={14} color={selectedTrack ? colors.white : colors.primary} />
              <Text style={[styles.selectBtnText, selectedTrack && styles.selectBtnTextActive]}>
                {selectedTrack
                  ? tracks.find((t) => t.id === selectedTrack)?.name ?? "Track"
                  : "Track"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedTrack ? colors.white : colors.textMuted} />
            </TouchableOpacity>

            <Modal visible={trackPickerOpen} transparent animationType="fade" onRequestClose={() => setTrackPickerOpen(false)}>
              <Pressable style={styles.modalOverlay} onPress={() => setTrackPickerOpen(false)}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Track</Text>
                  {tracks.map((t) => {
                    const isSelected = t.id === selectedTrack;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                        onPress={() => {
                          setSelectedTrack(isSelected ? null : t.id);
                          setTrackPickerOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.trackOptionRow}>
                          <View style={[styles.trackDot, { backgroundColor: t.color || colors.primary }]} />
                          <Text style={[styles.modalOptionLabel, isSelected && styles.modalOptionLabelActive]}>{t.name}</Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Pressable>
            </Modal>
          </>
        )}

        {/* Bookmarked toggle */}
        {user && (
          <TouchableOpacity
            style={[styles.toggleBtn, showBookmarked && styles.toggleActive]}
            onPress={() => setShowBookmarked(!showBookmarked)}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={14} color={showBookmarked ? colors.white : colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Reset filters */}
        {hasFilters && (
          <TouchableOpacity onPress={clearFilters} activeOpacity={0.7} style={styles.resetBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSpeaker}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="mic-outline"
            title={showBookmarked ? "No bookmarked speakers" : "No speakers found"}
            subtitle={showBookmarked ? "Star speakers to save them here" : "Try adjusting your search or filters"}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  speakerCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  bookmarkBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  speakerInfo: {
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 2,
  },
  speakerName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: "center",
  },
  speakerTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  speakerCompany: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
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
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  selectBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectBtnText: {
    ...typography.small,
    color: colors.textPrimary,
  },
  selectBtnTextActive: {
    color: colors.white,
  },
  toggleBtn: {
    padding: spacing.sm,
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
  resetBtn: {
    padding: 4,
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
  trackOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  trackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
