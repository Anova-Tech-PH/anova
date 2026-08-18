import React, { useState } from "react";
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
import { getConversations } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { Avatar } from "../../../src/components/avatar";
import { CountBadge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => getConversations(supabase, user!.id),
    enabled: !!user?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setRefreshing(false);
  };

  if (!user) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="log-in-outline"
          title="Sign in required"
          subtitle="Sign in to view your messages"
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

  const renderConversation = ({ item }: { item: any }) => {
    const lastMessage = item.last_message;
    const hasUnread = (item.unread_count ?? 0) > 0;

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => router.push(`/(app)/messages/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <Avatar
          name={item.display_name}
          size={48}
          uri={item.display_avatar}
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationTopRow}>
            <Text
              style={[styles.conversationName, hasUnread && styles.conversationNameBold]}
              numberOfLines={1}
            >
              {item.display_name}
            </Text>
            {lastMessage?.created_at && (
              <Text style={styles.timestamp}>
                {formatTimestamp(lastMessage.created_at)}
              </Text>
            )}
          </View>
          <View style={styles.conversationBottomRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {lastMessage?.content ?? "No messages yet"}
            </Text>
            <CountBadge count={item.unread_count ?? 0} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <FlatList
        data={conversations}
        keyExtractor={(item: any) => item.id}
        renderItem={renderConversation}
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
            icon="chatbubble-outline"
            title="No messages yet"
            subtitle="Start a conversation from an attendee's profile"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  conversationContent: {
    flex: 1,
    gap: spacing.xs,
  },
  conversationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conversationName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationNameBold: {
    fontWeight: "700",
  },
  timestamp: {
    ...typography.small,
    color: colors.textMuted,
  },
  conversationBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  lastMessage: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  lastMessageUnread: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
