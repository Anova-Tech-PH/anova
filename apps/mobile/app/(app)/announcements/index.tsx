import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getAnnouncementsForAttendee,
  markAnnouncementRead,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const readIdsRef = useRef<Set<string>>(new Set());

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", currentEvent?.id],
    queryFn: () => getAnnouncementsForAttendee(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  // Track which announcements the user has read in this session
  const { data: readAnnouncements = [] } = useQuery({
    queryKey: ["announcement-reads", currentEvent?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);
      return (data ?? []).map((r: any) => r.announcement_id);
    },
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const readSet = new Set([...readAnnouncements, ...readIdsRef.current]);

  const markReadMutation = useMutation({
    mutationFn: ({ announcementId }: { announcementId: string }) =>
      markAnnouncementRead(supabase, announcementId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement-reads"] });
    },
  });

  const markReadRef = useRef(markReadMutation);
  markReadRef.current = markReadMutation;
  const userRef = useRef(user);
  userRef.current = user;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!userRef.current) return;
      for (const token of viewableItems) {
        const id = token.item?.id;
        if (id && !readIdsRef.current.has(id)) {
          readIdsRef.current.add(id);
          markReadRef.current.mutate({ announcementId: id });
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["announcements"] });
    await queryClient.invalidateQueries({ queryKey: ["announcement-reads"] });
    setRefreshing(false);
  }, [queryClient]);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderAnnouncement = ({ item }: { item: any }) => {
    const isRead = readSet.has(item.id);

    return (
      <View style={[styles.card, !isRead && styles.cardUnread]}>
        <View style={styles.cardHeader}>
          {!isRead && <View style={styles.unreadDot} />}
          <View style={styles.cardHeaderContent}>
            <Text style={[styles.title, !isRead && styles.titleUnread]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.date}>
              {item.sent_at ? formatDate(item.sent_at) : ""}
            </Text>
          </View>
        </View>
        {item.body && (
          <Text style={styles.body} numberOfLines={3}>
            {item.body}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <FlatList
        data={announcements ?? []}
        keyExtractor={(item: any) => item.id}
        renderItem={renderAnnouncement}
        contentContainerStyle={shared.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="megaphone-outline"
            title="No announcements"
            subtitle="Announcements from organizers will appear here"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  cardHeaderContent: {
    flex: 1,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  titleUnread: {
    fontWeight: "700",
  },
  date: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
