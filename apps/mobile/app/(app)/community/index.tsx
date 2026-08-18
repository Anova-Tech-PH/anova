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
import { useRouter } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getTopics, createTopic, toggleFollow } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Badge } from "../../../src/components/badge";
import { TabBar } from "../../../src/components/tab-bar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const TABS = [
  { key: "all", label: "All" },
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

const TYPE_BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  discussion: { color: colors.primary, bg: colors.primaryMuted },
  announcement: { color: colors.warning, bg: colors.warningSoft },
  meetup: { color: colors.success, bg: colors.successSoft },
  ask_organizer: { color: colors.brandPink, bg: "rgba(255, 47, 146, 0.08)" },
};

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMeetupDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeBadgeLabel(type: string) {
  switch (type) {
    case "discussion": return "Discussion";
    case "announcement": return "Announcement";
    case "meetup": return "Meetup";
    case "ask_organizer": return "Ask Organizer";
    default: return type;
  }
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
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
    // "New" tab: topics from last 48h
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

  const renderTopic = ({ item }: { item: any }) => {
    const badgeColors = TYPE_BADGE_COLORS[item.type] ?? TYPE_BADGE_COLORS.discussion;

    return (
      <TouchableOpacity
        style={styles.topicCard}
        onPress={() => router.push(`/(app)/community/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.topicContent}>
          <View style={styles.topicHeader}>
            <View style={styles.topicTitleRow}>
              <Text style={styles.topicTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.pinned && (
                <Ionicons name="pin" size={14} color={colors.primary} />
              )}
            </View>
            {/* Follow button */}
            <TouchableOpacity
              style={styles.followIconBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                followMutation.mutate(item.id);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.is_following ? "notifications" : "notifications-outline"}
                size={18}
                color={item.is_following ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Type badge */}
          <View style={styles.badgeRow}>
            <Badge
              label={typeBadgeLabel(item.type)}
              color={badgeColors.color}
              backgroundColor={badgeColors.bg}
            />
          </View>

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
                  <Ionicons name="calendar-outline" size={12} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.success }]}>
                    {formatMeetupDate(item.meetup_date)}
                  </Text>
                </View>
              )}
              {item.meetup_location && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.success }]}>
                    {item.meetup_location}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.topicMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {item.post_count ?? 0} {item.post_count === 1 ? "post" : "posts"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {item.follower_count ?? 0}
              </Text>
            </View>
            <Text style={styles.metaText}>
              {formatRelativeDate(item.created_at)}
            </Text>
            {item.has_unread && <View style={styles.unreadDot} />}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search topics..." />
      <TabBar tabs={TABS} activeTab={activeTab} onTabPress={setActiveTab} />
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderTopic}
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
            icon="chatbubbles-outline"
            title={activeTab === "following" ? "Not following any topics" : "No topics yet"}
            subtitle={
              activeTab === "following"
                ? "Follow topics to see them here"
                : "Be the first to start a discussion"
            }
          />
        }
      />

      {/* FAB — New Topic */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

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
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  topicContent: {
    flex: 1,
    gap: spacing.xs,
  },
  topicHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  topicTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  topicTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  followIconBtn: {
    padding: 4,
  },
  topicDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  meetupInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: 2,
  },
  topicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...typography.small,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.md,
    elevation: 6,
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
