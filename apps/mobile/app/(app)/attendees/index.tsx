import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import {
  getEventAttendees,
  getAttendeeBookmarkIds,
  toggleAttendeeBookmark,
  saveAttendeeNote,
  createDmConversationMutation,
  sendMessageMutation,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, spacing, radius, shadows, shared } from "../../../src/theme";

type Tab = "all" | "bookmarked";

export default function AttendeesScreen() {
  const { currentEvent } = useEventContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  // Per-card toggle state
  const [messageOpenId, setMessageOpenId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSentId, setMessageSentId] = useState<string | null>(null);
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

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

  const sendMsgMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const conv = await createDmConversationMutation(supabase, currentEvent!.id, targetUserId);
      await sendMessageMutation(supabase, user!.id, {
        conversation_id: conv.id,
        content: messageText.trim(),
      });
    },
    onSuccess: (_data, targetUserId) => {
      setMessageText("");
      setMessageSentId(targetUserId);
      setTimeout(() => {
        setMessageOpenId(null);
        setMessageSentId(null);
      }, 2000);
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      saveAttendeeNote(supabase, user!.id, targetUserId, noteText),
    onSuccess: () => {
      setNotesOpenId(null);
      setNoteText("");
    },
  });

  const filtered = useMemo(() => {
    let list = (attendees as any[]).filter((a: any) => a.full_name);

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

  // Group alphabetically
  const sections = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const p of filtered) {
      const letter = (p.full_name?.[0] ?? "#").toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, data]) => ({ title: letter, data }));
  }, [filtered]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendees"] }),
      queryClient.invalidateQueries({ queryKey: ["attendee-bookmarks"] }),
    ]);
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
      <Text style={styles.pageTitle}>Attendee Directory</Text>
    </View>
  );

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <EmptyState icon="calendar-outline" title="Select an event" subtitle="Go to My Events to choose an event" />
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

  const totalCount = (attendees as any[]).filter((a: any) => a.full_name).length;

  const renderAttendee = ({ item }: { item: any }) => {
    const isBookmarked = bookmarkSet.has(item.id);
    const isOwnProfile = user?.id === item.id;
    const subtitle = [item.title, item.company].filter(Boolean).join(" @ ");
    const isMessageOpen = messageOpenId === item.id;
    const isNotesOpen = notesOpenId === item.id;
    const isSent = messageSentId === item.id;

    return (
      <View style={styles.cardOuter}>
        <View style={styles.cardTop}>
          <Avatar name={item.full_name} size={48} uri={item.avatar_url} />
          <View style={styles.cardInfo}>
            <TouchableOpacity onPress={() => router.push(`/(app)/attendees/${item.id}` as any)}>
              <Text style={styles.cardName} numberOfLines={1}>{item.full_name}</Text>
            </TouchableOpacity>
            {subtitle ? (
              <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        {/* Action buttons */}
        {user && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setNotesOpenId(null);
                setMessageOpenId(isMessageOpen ? null : item.id);
                setMessageText("");
                setMessageSentId(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.actionBtnText}>Say Hi!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setMessageOpenId(null);
                setNotesOpenId(isNotesOpen ? null : item.id);
                setNoteText("");
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.actionBtnText}>Take Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, isBookmarked && styles.actionBtnBookmarked]}
              onPress={() => bookmarkMutation.mutate(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isBookmarked ? "star" : "star-outline"}
                size={14}
                color={isBookmarked ? "#f59e0b" : colors.textPrimary}
              />
              <Text style={styles.actionBtnText}>{isBookmarked ? "Bookmarked" : "Bookmark"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Inline message */}
        {isMessageOpen && (
          <View style={styles.inlineSection}>
            {isSent ? (
              <View style={styles.sentRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.sentText}>Message sent!</Text>
              </View>
            ) : (
              <View style={styles.msgRow}>
                <TextInput
                  style={styles.msgInput}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Say something nice..."
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={() => {
                    if (messageText.trim()) sendMsgMutation.mutate(item.id);
                  }}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!messageText.trim() || sendMsgMutation.isPending) && styles.sendBtnDisabled]}
                  onPress={() => sendMsgMutation.mutate(item.id)}
                  disabled={!messageText.trim() || sendMsgMutation.isPending}
                >
                  {sendMsgMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="send" size={14} color={colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Inline notes */}
        {isNotesOpen && (
          <View style={styles.inlineSection}>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your notes about this attendee..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.noteActions}>
              <TouchableOpacity
                style={styles.noteSaveBtn}
                onPress={() => saveNoteMutation.mutate(item.id)}
                disabled={saveNoteMutation.isPending}
              >
                <Text style={styles.noteSaveBtnText}>
                  {saveNoteMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noteCancelBtn}
                onPress={() => { setNotesOpenId(null); setNoteText(""); }}
              >
                <Text style={styles.noteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.letterBadge}>
        <Text style={styles.letterText}>{section.title}</Text>
      </View>
      <View style={styles.sectionDivider} />
    </View>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}
      <Text style={[styles.pageSubtitle, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
        {totalCount.toLocaleString()} attendee{totalCount !== 1 ? "s" : ""} total
      </Text>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["all", "bookmarked"] as Tab[]).map((t) => {
          const isActive = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              {t === "bookmarked" && (
                <Ionicons
                  name="star"
                  size={14}
                  color={isActive ? colors.textPrimary : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
              )}
              {t === "all" && (
                <Ionicons
                  name="people"
                  size={14}
                  color={isActive ? colors.textPrimary : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t === "all" ? "All" : "Bookmarked"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, company, title..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item: any) => item.id}
        renderItem={renderAttendee}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={tab === "bookmarked" ? "star-outline" : "people-outline"}
            title={tab === "bookmarked" ? "No bookmarked attendees" : "No attendees found"}
            subtitle={
              tab === "bookmarked"
                ? "Tap the star icon on attendee cards to bookmark them"
                : search
                  ? "Try adjusting your search"
                  : undefined
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.lg,
    borderRadius: radius.sm,
    padding: 4,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  cardOuter: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionBtnBookmarked: {
    backgroundColor: "#fefce8",
    borderColor: "#fde68a",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  inlineSection: {
    marginTop: spacing.md,
  },
  sentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sentText: {
    fontSize: 14,
    color: colors.success,
  },
  msgRow: {
    flexDirection: "row",
    gap: 8,
  },
  msgInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 60,
  },
  noteActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  noteSaveBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteSaveBtnText: {
    fontSize: 14,
    color: colors.white,
  },
  noteCancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteCancelBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
