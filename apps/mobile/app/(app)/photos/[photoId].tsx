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
  Share,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getPhotoDetail,
  getPhotoComments,
  togglePhotoLike,
  addPhotoComment,
  deletePhoto,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

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

export default function PhotoDetailScreen() {
  const { photoId } = useLocalSearchParams<{ photoId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState("");

  // ── Queries ────────────────────────────────────────────────────

  const {
    data: photo,
    isLoading,
  } = useQuery({
    queryKey: ["photo-detail", photoId, user?.id],
    queryFn: () => getPhotoDetail(supabase, photoId!, user?.id),
    enabled: !!photoId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["photo-comments", photoId],
    queryFn: () => getPhotoComments(supabase, photoId!),
    enabled: !!photoId,
  });

  // ── Header ─────────────────────────────────────────────────────

  React.useEffect(() => {
    navigation.setOptions({
      title: "Photo",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={colors.white} />
          </TouchableOpacity>
          {photo && (photo as any).user_id === user?.id && (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [photo, navigation]);

  // ── Mutations ──────────────────────────────────────────────────

  const likeMutation = useMutation({
    mutationFn: () => togglePhotoLike(supabase, photoId!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-detail", photoId] });
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      addPhotoComment(supabase, {
        photoId: photoId!,
        userId: user!.id,
        content: newComment.trim(),
      }),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["photo-comments", photoId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePhoto(supabase, photoId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      router.back();
    },
  });

  // ── Handlers ───────────────────────────────────────────────────

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["photo-detail", photoId] }),
      queryClient.invalidateQueries({ queryKey: ["photo-comments", photoId] }),
    ]);
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!photo) return;
    try {
      await Share.share({
        message: (photo as any).caption
          ? `Check out this photo: ${(photo as any).caption}`
          : "Check out this photo!",
        url: (photo as any).image_url,
      });
    } catch {
      // user cancelled
    }
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      deleteMutation.mutate();
      return;
    }
    // Use Alert for native platforms
    const AlertModule = require("react-native").Alert;
    AlertModule.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() || !user) return;
    commentMutation.mutate();
  };

  // ── Loading ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!photo) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="image-outline"
          title="Photo not found"
          subtitle="This photo may have been deleted"
        />
      </SafeAreaView>
    );
  }

  const p = photo as any;

  // ── Render ─────────────────────────────────────────────────────

  const ListHeader = () => (
    <View>
      {/* Full-size Image */}
      <Image
        source={{ uri: p.image_url }}
        style={styles.fullImage}
        contentFit="contain"
        transition={300}
      />

      {/* Author Row */}
      <View style={styles.authorRow}>
        <Avatar
          name={p.author?.display_name}
          size={40}
          photoUrl={p.author?.avatar_url}
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>
            {p.author?.display_name ?? "Attendee"}
          </Text>
          <Text style={styles.timestamp}>{formatRelativeDate(p.created_at)}</Text>
        </View>
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            if (user) likeMutation.mutate();
          }}
          disabled={likeMutation.isPending}
        >
          <Ionicons
            name={p.is_liked ? "heart" : "heart-outline"}
            size={24}
            color={p.is_liked ? colors.error : colors.textSecondary}
          />
          {p.likes_count > 0 && (
            <Text
              style={[
                styles.actionCount,
                p.is_liked && { color: colors.error },
              ]}
            >
              {p.likes_count}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
          {comments.length > 0 && (
            <Text style={styles.actionCount}>{comments.length}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {p.caption ? (
        <View style={styles.captionContainer}>
          <Text style={styles.captionAuthor}>
            {p.author?.display_name ?? "Attendee"}
          </Text>
          <Text style={styles.captionText}>{p.caption}</Text>
        </View>
      ) : null}

      {/* Comments header */}
      {comments.length > 0 && (
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>
        </View>
      )}
    </View>
  );

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentRow}>
      <Avatar name={item.author_name} size={32} />
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentAuthor}>{item.author_name}</Text>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
        <Text style={styles.commentTime}>{formatRelativeDate(item.created_at)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          data={comments}
          keyExtractor={(item: any) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>
                No comments yet. Be the first!
              </Text>
            </View>
          }
        />

        {/* Comment Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newComment.trim() || commentMutation.isPending) && { opacity: 0.4 },
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },

  // Image
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.black,
  },

  // Author
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  authorInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  authorName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Caption
  captionContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  captionAuthor: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  captionText: {
    ...typography.body,
    color: colors.textPrimary,
  },

  // Comments
  commentsHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  commentsTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commentRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  commentBubble: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentAuthor: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  commentText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  commentTime: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  noComments: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  noCommentsText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Input Bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
});
