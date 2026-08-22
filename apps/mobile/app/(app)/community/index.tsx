import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { getTopics, createTopic, toggleFollow } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const TABS = [
  { key: "all", label: "All Topics" },
  { key: "following", label: "Following" },
  { key: "by_organizers", label: "By Organizers" },
  { key: "new", label: "New" },
];

const TOPIC_TYPES = [
  { key: "discussion", label: "Discussion" },
  { key: "announcement", label: "Announcement" },
  { key: "meetup", label: "Meetup" },
  { key: "ask_organizer", label: "Ask Organizer" },
];

const TYPE_ICONS: Record<string, string> = {
  discussion: "chatbubble-outline",
  announcement: "megaphone-outline",
  meetup: "location-outline",
  ask_organizer: "help-circle-outline",
};

const TYPE_BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  discussion: { color: colors.primary, bg: colors.primaryMuted },
  announcement: { color: colors.warning, bg: colors.warningSoft },
  meetup: { color: colors.success, bg: colors.successSoft },
  ask_organizer: { color: colors.brandPink, bg: "rgba(255, 47, 146, 0.08)" },
};

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMeetupDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create topic form state
  const [newType, setNewType] = useState("discussion");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMeetupDate, setNewMeetupDate] = useState("");
  const [newMeetupLocation, setNewMeetupLocation] = useState("");

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["topics", currentEvent?.id, user?.id, activeTab, search],
    queryFn: () =>
      getTopics(supabase, currentEvent!.id, user!.id, {
        tab: activeTab,
        search: search || undefined,
      }),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const filtered = useMemo(() => {
    if (activeTab !== "new") return topics;
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return topics.filter(
      (t: any) => new Date(t.created_at).getTime() > cutoff
    );
  }, [topics, activeTab]);

  const createMutation = useMutation({
    mutationFn: () =>
      createTopic(supabase, {
        eventId: currentEvent!.id,
        authorId: user!.id,
        title: newTitle,
        description: newDescription || undefined,
        type: newType,
        meetupDate: newType === "meetup" ? newMeetupDate || undefined : undefined,
        meetupLocation: newType === "meetup" ? newMeetupLocation || undefined : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      resetForm();
      setShowCreateModal(false);
    },
  });

  const followMutation = useMutation({
    mutationFn: (topicId: string) => toggleFollow(supabase, topicId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  const resetForm = useCallback(() => {
    setNewType("discussion");
    setNewTitle("");
    setNewDescription("");
    setNewMeetupDate("");
    setNewMeetupLocation("");
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["topics"] });
    setRefreshing(false);
  };

  const header = (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.pageTitle}>Community</Text>
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

  const renderTopic = ({ item }: { item: any }) => {
    const isPinned = item.pinned;
    const typeIcon = TYPE_ICONS[item.type] ?? "chatbubble-outline";

    return (
      <TouchableOpacity
        style={[
          styles.topicCard,
          isPinned && styles.topicCardPinned,
        ]}
        onPress={() => router.push(`/(app)/community/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          {/* Type icon box */}
          <View style={styles.typeIconBox}>
            <Ionicons name={typeIcon as any} size={16} color={colors.textMuted} />
          </View>

          <View style={styles.topicContent}>
            {/* Title row */}
            <View style={styles.topicTitleRow}>
              {item.has_unread && <View style={styles.unreadDot} />}
              {isPinned && (
                <Ionicons name="pin" size={13} color="#f59e0b" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.topicTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>

            {/* Description */}
            {item.description && (
              <Text style={styles.topicDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            {/* Meetup info */}
            {item.type === "meetup" && (item.meetup_date || item.meetup_location) && (
              <View style={styles.meetupInfo}>
                {item.meetup_date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>
                      {formatMeetupDate(item.meetup_date)}
                    </Text>
                  </View>
                )}
                {item.meetup_location && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>
                      {item.meetup_location}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Meta row: date, posts, followers, follow button */}
            <View style={styles.topicMeta}>
              <Text style={styles.metaTextSmall}>
                {formatRelativeDate(item.created_at)}
              </Text>
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{item.post_count ?? 0}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{item.follower_count ?? 0}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  item.is_following && styles.followBtnActive,
                ]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  followMutation.mutate(item.id);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={[
                    styles.followBtnText,
                    item.is_following && styles.followBtnTextActive,
                  ]}
                >
                  {item.is_following ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Custom Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={styles.menuBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.newTopicBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.newTopicBtnText}>New topic</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.pageTitle}>Community</Text>
        <Text style={styles.pageSubtitle}>
          {filtered.length} topic{filtered.length !== 1 ? "s" : ""}
        </Text>
      </View>


      {/* Tabs — pill/segment style matching web */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search topics..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Topic list */}
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderTopic}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="chatbubbles-outline"
              title={search ? "No topics match your search" : activeTab === "following" ? "Not following any topics" : "No topics yet"}
              subtitle={
                search
                  ? "Try a different search term"
                  : activeTab === "following"
                    ? "Follow topics to see them here"
                    : "Be the first to start a conversation!"
              }
            />
            {!search && activeTab !== "following" && (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={colors.textPrimary} />
                <Text style={styles.emptyActionText}>Start a topic</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Create Topic Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Topic</Text>
                <TouchableOpacity
                  onPress={() => {
                    resetForm();
                    setShowCreateModal(false);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Type selector */}
                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.typeChips}>
                  {TOPIC_TYPES.map((t) => {
                    const isActive = newType === t.key;
                    const badgeColors = TYPE_BADGE_COLORS[t.key];
                    return (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.typeChip,
                          isActive && {
                            backgroundColor: badgeColors.bg,
                            borderColor: badgeColors.color,
                          },
                        ]}
                        onPress={() => setNewType(t.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            isActive && { color: badgeColors.color },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Title */}
                <Text style={styles.fieldLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Topic title"
                  placeholderTextColor={colors.textMuted}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  maxLength={200}
                />

                {/* Description */}
                <Text style={styles.fieldLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe your topic..."
                  placeholderTextColor={colors.textMuted}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                />

                {/* Meetup-specific fields */}
                {newType === "meetup" && (
                  <>
                    <Text style={styles.fieldLabel}>Meetup Date & Time</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 2026-08-20 14:00"
                      placeholderTextColor={colors.textMuted}
                      value={newMeetupDate}
                      onChangeText={setNewMeetupDate}
                    />

                    <Text style={styles.fieldLabel}>Meetup Location</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Lobby, Room 201"
                      placeholderTextColor={colors.textMuted}
                      value={newMeetupLocation}
                      onChangeText={setNewMeetupLocation}
                    />
                  </>
                )}
              </ScrollView>

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!newTitle.trim() || createMutation.isPending) && styles.submitButtonDisabled,
                ]}
                onPress={() => createMutation.mutate()}
                disabled={!newTitle.trim() || createMutation.isPending}
                activeOpacity={0.8}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Create Topic</Text>
                )}
              </TouchableOpacity>

              {createMutation.isError && (
                <Text style={styles.errorText}>
                  {(createMutation.error as Error)?.message ?? "Failed to create topic"}
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  menuBtn: {
    padding: 4,
  },
  newTopicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  newTopicBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.white,
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

  // Tabs — pill/segment style
  tabContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
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
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 8,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Topic card
  topicCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  topicCardPinned: {
    borderColor: "#fde68a",
    backgroundColor: "rgba(254, 243, 199, 0.3)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  topicContent: {
    flex: 1,
    gap: 4,
  },
  topicTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    marginRight: 6,
  },
  topicDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  meetupInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: 4,
  },
  topicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaTextSmall: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Follow button
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  followBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  followBtnTextActive: {
    color: colors.white,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingTop: spacing.xl,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  modalBody: {
    paddingTop: spacing.md,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  typeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  textInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
