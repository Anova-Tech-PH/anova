import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getScheduleData,
  getUserBookmarks,
  toggleSessionBookmark,
  getUserRsvps,
  rsvpToSession,
  cancelRsvp,
  getMyNotes,
  getSessionPollCounts,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
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

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"full" | "my-agenda">("full");
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

  const { data: userRsvps = [] } = useQuery({
    queryKey: ["userRsvps", currentEvent?.id, user?.id],
    queryFn: () => getUserRsvps(supabase, currentEvent!.id, user!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const { data: userNotes = [] } = useQuery({
    queryKey: ["userNotes", currentEvent?.id, user?.id],
    queryFn: () => getMyNotes(supabase, currentEvent!.id, user!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const sessionIds = useMemo(() => (data?.sessions ?? []).map((s: any) => s.id), [data?.sessions]);
  const { data: pollCounts = {} } = useQuery({
    queryKey: ["pollCounts", currentEvent?.id],
    queryFn: () => getSessionPollCounts(supabase, sessionIds),
    enabled: sessionIds.length > 0,
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ sessionId, isRsvpd }: { sessionId: string; isRsvpd: boolean }) => {
      if (isRsvpd) {
        await cancelRsvp(supabase, sessionId);
      } else {
        await rsvpToSession(supabase, sessionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRsvps"] });
    },
  });

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const rsvpSet = useMemo(() => new Set(userRsvps.map((r: any) => r.session_id)), [userRsvps]);
  const noteSet = useMemo(() => new Set(userNotes.map((n: any) => n.session_id)), [userNotes]);

  const dayTabs = useMemo(() => {
    if (!data?.event) return [];
    return getDayTabs(data.event.start_date, data.event.end_date);
  }, [data?.event]);

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
          s.description?.toLowerCase().includes(q) ||
          s.location?.toLowerCase().includes(q)
      );
    }

    // Filter by bookmarks (My Agenda tab)
    if (activeTab === "my-agenda") {
      sessions = sessions.filter((s: any) => bookmarkSet.has(s.id));
    }

    return sessions;
  }, [data?.sessions, selectedDay, search, activeTab, bookmarkSet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
      queryClient.invalidateQueries({ queryKey: ["userRsvps"] }),
      queryClient.invalidateQueries({ queryKey: ["userNotes"] }),
    ]);
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

  const selectedDayTab = dayTabs.find((d) => d.key === selectedDay);
  const sessionCount = filteredSessions.filter((s: any) => s.type !== "break").length;

  const renderSession = ({ item }: { item: any }) => {
    const tracks = (item.session_tracks ?? []).map((st: any) => st.tracks).filter(Boolean);
    const speakers = (item.session_speakers ?? []).map((ss: any) => ss.speakers).filter(Boolean);
    const isBookmarked = bookmarkSet.has(item.id);
    const isRsvpd = rsvpSet.has(item.id);
    const hasNote = noteSet.has(item.id);
    const pollCount = pollCounts[item.id] ?? 0;
    const trackColor = item.track?.color ?? (tracks[0]?.color || null);

    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          item.type === "break" && styles.sessionCardBreak,
          trackColor && { borderLeftWidth: 3, borderLeftColor: trackColor },
        ]}
        onPress={() => router.push(`/(app)/schedule/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {/* Badge row */}
        <View style={styles.badgeRow}>
          <Badge label={item.type || "session"} />
          {(item.track || tracks[0]) && (
            <Text style={styles.trackName}>{item.track?.name || tracks[0]?.name}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.sessionTitle} numberOfLines={2}>{item.title}</Text>

        {/* Description */}
        {item.description && (
          <Text style={styles.sessionDesc} numberOfLines={2}>
            {stripHtml(item.description)}
          </Text>
        )}

        {/* Time + Location row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {formatTime(item.start_time)} - {formatTime(item.end_time)}
            </Text>
          </View>
          {item.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.location}</Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  router.navigate("/(app)/floormap" as any);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.viewMapLink}>View Map</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Speakers */}
        {speakers.length > 0 && (
          <View style={styles.speakerRow}>
            {speakers.slice(0, 3).map((sp: any) => (
              <View key={sp.id} style={styles.speakerChip}>
                <Avatar name={sp.name} size={24} uri={sp.photo} />
                <View>
                  <Text style={styles.speakerName}>{sp.name}</Text>
                  {sp.title && (
                    <Text style={styles.speakerTitle}> · {sp.title}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* RSVP button */}
        {user && item.rsvp_enabled && (
          <View style={styles.rsvpRow}>
            <TouchableOpacity
              style={[styles.rsvpBtn, isRsvpd && styles.rsvpBtnActive]}
              onPress={(e) => {
                e.stopPropagation?.();
                rsvpMutation.mutate({ sessionId: item.id, isRsvpd });
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isRsvpd ? "checkmark-circle" : "add-circle-outline"}
                size={14}
                color={isRsvpd ? colors.white : colors.primary}
              />
              <Text style={[styles.rsvpText, isRsvpd && styles.rsvpTextActive]}>
                {isRsvpd ? "RSVP'd" : "RSVP"}
              </Text>
            </TouchableOpacity>
            {item.capacity != null && (
              <Text style={styles.capacityText}>
                {item.capacity - (item.rsvp_count ?? 0)} spots left
              </Text>
            )}
          </View>
        )}

        {/* Actions row: Add to My Agenda + Add notes + View Details */}
        {user && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.agendaBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                bookmarkMutation.mutate({ sessionId: item.id });
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isBookmarked ? "calendar" : "calendar-outline"}
                size={14}
                color={isBookmarked ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.agendaBtnText, isBookmarked && styles.agendaBtnTextActive]}>
                {isBookmarked ? "In My Agenda" : "Add to My Agenda"}
              </Text>
            </TouchableOpacity>
            {item.type !== "break" && (
              <TouchableOpacity
                style={styles.notesBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push(`/(app)/schedule/${item.id}` as any);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={12} color={colors.textMuted} />
                <Text style={styles.notesBtnText}>
                  {hasNote ? "Edit notes" : "Add notes"}
                </Text>
              </TouchableOpacity>
            )}
            {pollCount > 0 && (
              <TouchableOpacity
                style={styles.notesBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push(`/(app)/schedule/${item.id}` as any);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="stats-chart-outline" size={12} color={colors.textMuted} />
                <Text style={styles.notesBtnText}>
                  {pollCount} {pollCount === 1 ? "poll" : "polls"}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.viewDetailsLink}>View Details →</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuButton}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredSessions}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Page title */}
            <Text style={styles.pageTitle}>
              {currentEvent.title} — Schedule
            </Text>

            {/* Full Agenda / My Agenda tabs */}
            {user && (
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === "full" && styles.tabActive]}
                  onPress={() => setActiveTab("full")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === "full" && styles.tabTextActive]}>
                    Full Agenda
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === "my-agenda" && styles.tabActive]}
                  onPress={() => setActiveTab("my-agenda")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === "my-agenda" && styles.tabTextActive]}>
                    My Agenda
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title, location, or description..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Day selector dropdown */}
            {dayTabs.length > 1 && (
              <TouchableOpacity
                style={styles.daySelector}
                onPress={() => setDayPickerOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.daySelectorText}>
                  {selectedDayTab?.date ?? "Select day"}
                  <Text style={styles.daySelectorCount}>
                    {" "}({sessionCount} sessions)
                  </Text>
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={activeTab === "my-agenda" ? "No sessions in your agenda" : "No sessions found"}
            subtitle={
              activeTab === "my-agenda"
                ? 'Browse the full agenda and tap "Add to My Agenda" on sessions you want to attend.'
                : "Try adjusting your search or day filter"
            }
          />
        }
      />

      {/* Day picker modal */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  menuButton: {
    padding: spacing.xs,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  listHeader: {
    paddingBottom: spacing.lg,
  },

  // Page title
  pageTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 32,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginTop: spacing.lg,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Day selector
  daySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  daySelectorText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  daySelectorCount: {
    fontWeight: "400",
    color: colors.textMuted,
  },

  // Session card (matches web structure)
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sessionCardBreak: {
    backgroundColor: colors.surfaceElevated,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  trackName: {
    fontSize: 10,
    color: colors.textMuted,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: 6,
  },
  sessionDesc: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewMapLink: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  speakerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  speakerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  speakerName: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  speakerTitle: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // RSVP
  rsvpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rsvpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rsvpBtnActive: {
    backgroundColor: colors.primary,
  },
  rsvpText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  rsvpTextActive: {
    color: colors.white,
  },
  capacityText: {
    fontSize: 11,
    fontWeight: "400",
    color: colors.textMuted,
  },

  // Actions row (matches web: Add to My Agenda + notes + View Details)
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  agendaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  agendaBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  agendaBtnTextActive: {
    color: colors.primary,
  },
  notesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  notesBtnText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewDetailsLink: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.primary,
    marginLeft: "auto",
  },

  // Day picker modal
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
    width: "100%",
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
});
