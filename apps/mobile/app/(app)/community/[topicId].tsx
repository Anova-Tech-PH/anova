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
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
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
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const TYPE_BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  discussion: { color: colors.primary, bg: colors.primaryMuted },
  announcement: { color: colors.warning, bg: colors.warningSoft },
  meetup: { color: colors.success, bg: colors.successSoft },
  ask_organizer: { color: colors.brandPink, bg: "rgba(255, 47, 146, 0.08)" },
};

function typeBadgeLabel(type: string) {
  switch (type) {
    case "discussion": return "Discussion";
    case "announcement": return "Announcement";
    case "meetup": return "Meetup";
    case "ask_organizer": return "Ask Organizer";
    default: return type;
  }
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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔"];

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState("");

  const { data: topic, isLoading, error } = useQuery({
    queryKey: ["topic-detail", topicId, user?.id],
    queryFn: () => getTopicDetail(supabase, topicId!, user?.id),
    enabled: !!topicId,
  });

  React.useEffect(() => {
    const title = (topic as any)?.title;
    navigation.setOptions({
      title: title ?? "Topic",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [topic, navigation]);

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

  const posts = (topic as any).posts ?? [];

  const topicType = (topic as any).type ?? "discussion";
  const badgeColors = TYPE_BADGE_COLORS[topicType] ?? TYPE_BADGE_COLORS.discussion;

  const renderHeader = () => (
    <View style={styles.topicHeader}>
      <View style={styles.titleWithBadge}>
        <Text style={styles.topicTitle}>{(topic as any).title}</Text>
        <Badge
          label={typeBadgeLabel(topicType)}
          color={badgeColors.color}
          backgroundColor={badgeColors.bg}
        />
      </View>

      {/* Author info */}
      {(topic as any).author && (
        <View style={styles.authorRow}>
          <Avatar
            name={(topic as any).author.display_name}
            size={32}
            uri={(topic as any).author.avatar_url}
          />
          <View>
            <Text style={styles.authorName}>
              {(topic as any).author.display_name ?? "Unknown"}
            </Text>
            <Text style={styles.topicDate}>
              {formatRelativeDate((topic as any).created_at)}
            </Text>
          </View>
        </View>
      )}

      {(topic as any).description && (
        <Text style={styles.topicBody}>{(topic as any).description}</Text>
      )}

      {/* Meetup details */}
      {topicType === "meetup" &&
        ((topic as any).meetup_date || (topic as any).meetup_location) && (
          <View style={styles.meetupBlock}>
            {(topic as any).meetup_date && (
              <View style={styles.meetupRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.success} />
                <Text style={styles.meetupText}>
                  {formatMeetupDate((topic as any).meetup_date)}
                </Text>
              </View>
            )}
            {(topic as any).meetup_location && (
              <View style={styles.meetupRow}>
                <Ionicons name="location-outline" size={16} color={colors.success} />
                <Text style={styles.meetupText}>
                  {(topic as any).meetup_location}
                </Text>
              </View>
            )}
          </View>
        )}

      {/* Follow button */}
      {user && (
        <TouchableOpacity
          style={[
            styles.followButton,
            (topic as any).is_following && styles.followButtonActive,
          ]}
          onPress={() => followMutation.mutate()}
          activeOpacity={0.7}
          disabled={followMutation.isPending}
        >
          <Ionicons
            name={(topic as any).is_following ? "notifications" : "notifications-outline"}
            size={16}
            color={(topic as any).is_following ? colors.white : colors.primary}
          />
          <Text
            style={[
              styles.followButtonText,
              (topic as any).is_following && styles.followButtonTextActive,
            ]}
          >
            {(topic as any).is_following ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />
      <Text style={styles.postsHeading}>
        {posts.length} {posts.length === 1 ? "Reply" : "Replies"}
      </Text>
    </View>
  );

  const renderPost = ({ item }: { item: any }) => {
    const reactions: Record<string, number> = item.reactions ?? {};
    const userReactions: string[] = item.user_reactions ?? [];

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Avatar
            name={item.attendee_profiles?.display_name}
            size={32}
            uri={item.attendee_profiles?.avatar_url}
          />
          <View style={styles.postAuthorInfo}>
            <Text style={styles.postAuthorName}>
              {item.attendee_profiles?.display_name ?? "Unknown"}
            </Text>
            <Text style={styles.postDate}>
              {formatRelativeDate(item.created_at)}
            </Text>
          </View>
        </View>
        <Text style={styles.postContent}>{item.content}</Text>

        {/* Reactions */}
        <View style={styles.reactionsRow}>
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactions[emoji] ?? 0;
            const isActive = userReactions.includes(emoji);
            if (count === 0 && !isActive) return null;
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
          {/* Add reaction button */}
          {user && (
            <TouchableOpacity
              style={styles.addReactionBtn}
              onPress={() => {
                // Quick add thumbs up reaction
                reactionMutation.mutate({ postId: item.id, emoji: "👍" });
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="happy-outline"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
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
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topicHeader: {
    marginBottom: spacing.lg,
  },
  titleWithBadge: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  topicTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  meetupBlock: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  meetupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  meetupText: {
    ...typography.caption,
    color: colors.success,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  authorName: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  topicDate: {
    ...typography.small,
    color: colors.textMuted,
  },
  topicBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  followButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followButtonText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  followButtonTextActive: {
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  postsHeading: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  postDate: {
    ...typography.small,
    color: colors.textMuted,
  },
  postContent: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reactionChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    ...typography.small,
    color: colors.textMuted,
  },
  reactionCountActive: {
    color: colors.primary,
  },
  addReactionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPosts: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyPostsText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
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
