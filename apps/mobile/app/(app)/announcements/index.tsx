import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import {
  getAnnouncementsForAttendee,
  markAnnouncementRead,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const readIdsRef = useRef<Set<string>>(new Set());

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", currentEvent?.id],
    queryFn: () => getAnnouncementsForAttendee(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

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
      <Text style={styles.pageTitle}>Announcements</Text>
      <Text style={styles.pageSubtitle}>
        Updates from the {currentEvent?.title ?? "event"} organizers.
      </Text>
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

  const items = announcements ?? [];

  const renderAnnouncement = ({ item }: { item: any }) => {
    const isUnread = !readSet.has(item.id);

    return (
      <View style={[styles.card, isUnread && styles.cardUnread]}>
        <View style={styles.cardRow}>
          {/* Megaphone icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.titleTimeRow}>
              <View style={styles.titleRow}>
                {isUnread && <View style={styles.unreadDot} />}
                <Text style={styles.title} numberOfLines={2}>
                  {item.subject}
                </Text>
              </View>
              {item.sent_at && (
                <Text style={styles.time}>{timeAgo(item.sent_at)}</Text>
              )}
            </View>
            {item.body && (
              <Text style={styles.body} numberOfLines={4}>
                {item.body}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}

      <FlatList
        data={items}
        keyExtractor={(item: any) => item.id}
        renderItem={renderAnnouncement}
        contentContainerStyle={styles.listContent}
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
            title="No announcements yet"
            subtitle="Announcements from organizers will appear here"
          />
        }
      />
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

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardUnread: {
    borderColor: "rgba(139, 61, 255, 0.3)",
    backgroundColor: "rgba(139, 61, 255, 0.04)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  titleTimeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 6,
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    lineHeight: 20,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 0,
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
});
