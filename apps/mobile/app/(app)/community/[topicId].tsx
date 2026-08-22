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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getTopicDetail,
  createPost,
  toggleReaction,
  toggleFollow,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const TYPE_ICONS: Record<string, string> = {
  discussion: "chatbubble-outline",
  announcement: "megaphone-outline",
  meetup: "location-outline",
  ask_organizer: "help-circle-outline",
};

const TYPE_LABELS: Record<string, string> = {
  discussion: "Discussion",
  announcement: "Announcement",
  meetup: "Meetup",
  ask_organizer: "Ask Organizer",
};

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPostDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

const REACTION_EMOJIS = ["👍", "❤️", "🤣"] as const;

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState("");

  const { data: topic, isLoading, error } = useQuery({
    queryKey: ["topic-detail", topicId, user?.id],
    queryFn: () => getTopicDetail(supabase, topicId!, user?.id),
    enabled: !!topicId,
  });

  const postMutation = useMutation({
    mutationFn: () =>
      createPost(supabase, {
        topicId: topicId!,
        authorId: user!.id,
        content: newPost,
      }),
    onSuccess: () => {
      setNewPost("");
      queryClient.invalidateQueries({ queryKey: ["topic-detail", topicId] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, emoji }: { postId: string; emoji: string }) =>
      toggleReaction(supabase, postId, user!.id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-detail", topicId] });
    },
  });

  const followMutation = useMutation({
    mutationFn: () => toggleFollow(supabase, topicId!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-detail", topicId] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["topic-detail", topicId] });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !topic) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="alert-circle-outline" title="Topic not found" />
      </SafeAreaView>
    );
  }

  const t = topic as any;
  const posts = t.posts ?? [];
  const topicType = t.type ?? "discussion";
  const typeIcon = TYPE_ICONS[topicType] ?? "chatbubble-outline";
  const typeLabel = TYPE_LABELS[topicType] ?? topicType;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Topic card */}
      <View style={styles.topicCard}>
        {/* Badge + title + follow button row */}
        <View style={styles.titleFollowRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Type badge */}
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Ionicons name={typeIcon as any} size={12} color={colors.white} />
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </View>
            </View>
            <Text style={styles.topicTitle}>{t.title}</Text>
          </View>
          {user && (
            <TouchableOpacity
              style={[
                styles.followBtn,
                t.is_following && styles.followBtnActive,
              ]}
              onPress={() => followMutation.mutate()}
              activeOpacity={0.7}
              disabled={followMutation.isPending}
            >
              <Text
                style={[
                  styles.followBtnText,
                  t.is_following && styles.followBtnTextActive,
                ]}
              >
                {t.is_following ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Author + date */}
        <View style={styles.authorRow}>
          <Avatar
            name={t.author?.display_name}
            size={28}
            uri={t.author?.avatar_url}
          />
          <Text style={styles.authorName}>
            {t.author?.display_name ?? "Unknown"}
          </Text>
          <Text style={styles.authorSep}>-</Text>
          <Text style={styles.authorDate}>
            {formatFullDate(t.created_at)}
          </Text>
        </View>

        {/* Description */}
        {t.description && (
          <Text style={styles.topicBody}>{t.description}</Text>
        )}

        {/* Meetup details */}
        {topicType === "meetup" &&
          (t.meetup_date || t.meetup_location) && (
            <View style={styles.meetupBlock}>
              {t.meetup_date && (
                <View style={styles.meetupRow}>
                  <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                  <Text style={styles.meetupText}>
                    {formatMeetupDate(t.meetup_date)}
                  </Text>
                </View>
              )}
              {t.meetup_location && (
                <View style={styles.meetupRow}>
                  <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                  <Text style={styles.meetupText}>
                    {t.meetup_location}
                  </Text>
                </View>
              )}
            </View>
          )}
      </View>

      {/* Replies heading */}
      <Text style={styles.repliesHeading}>
        {posts.length} {posts.length === 1 ? "reply" : "replies"}
      </Text>
    </View>
  );

  const renderPost = ({ item }: { item: any }) => {
    const profile = Array.isArray(item.attendee_profiles)
      ? item.attendee_profiles[0]
      : item.attendee_profiles;
    const reactions: Record<string, number> = item.reactions ?? {};
    const userReactions: string[] = item.user_reactions ?? [];

    return (
      <View style={styles.postCard}>
        <View style={styles.postRow}>
          <Avatar
            name={profile?.display_name}
            size={28}
            uri={profile?.avatar_url}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.postAuthorRow}>
              <Text style={styles.postAuthorName}>
                {profile?.display_name ?? "Unknown"}
              </Text>
              <Text style={styles.postDate}>
                {formatPostDate(item.created_at)}
              </Text>
            </View>
            <Text style={styles.postContent}>{item.content}</Text>

            {/* Reactions — always show all 3 emojis */}
            <View style={styles.reactionsRow}>
              {REACTION_EMOJIS.map((emoji) => {
                const count = reactions[emoji] ?? 0;
                const isActive = userReactions.includes(emoji);
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.reactionChip, isActive && styles.reactionChipActive]}
                    onPress={() =>
                      user && reactionMutation.mutate({ postId: item.id, emoji })
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {count > 0 && (
                      <Text
                        style={[
                          styles.reactionCount,
                          isActive && styles.reactionCountActive,
                        ]}
                      >
                        {count}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Custom header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
          <Text style={styles.backText}>Back to community</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          data={posts}
          keyExtractor={(item: any) => item.id}
          renderItem={renderPost}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyPostsText}>
                No replies yet. Be the first to respond!
              </Text>
            </View>
          }
        />

        {/* Compose bar */}
        {user && (
          <View style={styles.composeBar}>
            <TextInput
              style={styles.composeInput}
              placeholder="Write a reply..."
              placeholderTextColor={colors.textMuted}
              value={newPost}
              onChangeText={setNewPost}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newPost.trim() || postMutation.isPending) && styles.sendButtonDisabled,
              ]}
              onPress={() => postMutation.mutate()}
              disabled={!newPost.trim() || postMutation.isPending}
              activeOpacity={0.7}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  newPost.trim() && !postMutation.isPending
                    ? colors.white
                    : colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Navigation header
  navHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerContainer: {
    marginBottom: spacing.md,
  },

  // Topic card
  topicCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  titleFollowRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.white,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 26,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: 20,
  },
  followBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  followBtnTextActive: {
    color: colors.white,
  },

  // Author
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  authorSep: {
    fontSize: 13,
    color: colors.textMuted,
  },
  authorDate: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Description
  topicBody: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.md,
  },

  // Meetup
  meetupBlock: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  meetupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meetupText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Replies heading
  repliesHeading: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  // Post card
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  postRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  postDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  postContent: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: 4,
  },

  // Reactions
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: spacing.sm,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
  },
  reactionChipActive: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reactionCountActive: {
    color: "#1d4ed8",
  },

  // Empty
  emptyPosts: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyPostsText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Compose
  composeBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  composeInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});
