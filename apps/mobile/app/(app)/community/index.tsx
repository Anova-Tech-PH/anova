import React, { useState, useMemo } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getTopics } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

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

export default function CommunityScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["topics", currentEvent?.id, user?.id],
    queryFn: () => getTopics(supabase, currentEvent!.id, user!.id, { search: search || undefined }),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const filtered = useMemo(() => {
    if (!search) return topics;
    const q = search.toLowerCase();
    return topics.filter(
      (t: any) => t.title?.toLowerCase().includes(q)
    );
  }, [topics, search]);

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

  const renderTopic = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.topicCard}
      onPress={() => router.push(`/(app)/community/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.topicContent}>
        <View style={styles.topicHeader}>
          <Text style={styles.topicTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.pinned && (
            <Ionicons name="pin" size={14} color={colors.primary} />
          )}
        </View>
        {item.description && (
          <Text style={styles.topicDescription} numberOfLines={2}>
            {item.description}
          </Text>
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

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search topics..." />
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
            title="No topics yet"
            subtitle="Be the first to start a discussion"
          />
        }
      />
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
    alignItems: "center",
    gap: spacing.sm,
  },
  topicTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  topicDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
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
});
