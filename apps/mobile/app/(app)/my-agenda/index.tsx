import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
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
  getMyAgendaSessions,
  toggleSessionBookmark,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shared } from "../../../src/theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  keynote: { bg: colors.primaryMuted, text: colors.primary },
  talk: { bg: "rgba(59, 130, 246, 0.08)", text: "#3b82f6" },
  workshop: { bg: colors.successSoft, text: colors.success },
  panel: { bg: colors.warningSoft, text: colors.warning },
  break: { bg: colors.muted, text: colors.textMuted },
};

export default function MyAgendaScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["my-agenda", currentEvent?.id, user?.id],
    queryFn: () =>
      getMyAgendaSessions(supabase, currentEvent!.id, user!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const removeMutation = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) =>
      toggleSessionBookmark(supabase, sessionId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const filteredSessions = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s: any) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["my-agenda"] });
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
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>My Agenda</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/schedule" as any)}
          style={styles.fullAgendaBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.fullAgendaText}>Go to full agenda</Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
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

  const renderSession = ({ item }: { item: any }) => {
    const speakers = (item.session_speakers ?? [])
      .map((ss: any) => ss.speakers)
      .filter(Boolean);
    const typeStyle = TYPE_COLORS[item.type] ?? TYPE_COLORS.break;

    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          item.type === "break" && styles.sessionCardBreak,
        ]}
        onPress={() => router.push(`/(app)/schedule/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {/* Type badge */}
        {item.type && (
          <View
            style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}
          >
            <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
              {item.type}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.sessionTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Description */}
        {item.description && (
          <Text style={styles.sessionDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Time + Location row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {formatTime(item.start_time)} - {formatTime(item.end_time)}
            </Text>
          </View>
          {item.location && (
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={styles.metaText}>{item.location}</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/(app)/floormap?highlight=${encodeURIComponent(item.location)}` as any
                  )
                }
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.viewMapLink}>View Map</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Speakers */}
        {speakers.length > 0 && (
          <View style={styles.speakerRow}>
            {speakers.slice(0, 3).map((sp: any) => (
              <View key={sp.id} style={styles.speakerChip}>
                <Avatar name={sp.name} size={24} />
                <View>
                  <Text style={styles.speakerName} numberOfLines={1}>
                    {sp.name}
                  </Text>
                  {sp.title && (
                    <Text style={styles.speakerTitle} numberOfLines={1}>
                      · {sp.title}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={filteredSessions}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSession}
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
              icon="calendar-outline"
              title="No sessions found"
              subtitle="Browse the full agenda to add sessions"
            />
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push("/(app)/schedule" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.browseBtnText}>Browse agenda</Text>
            </TouchableOpacity>
          </View>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  fullAgendaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fullAgendaText: {
    fontSize: 14,
    color: colors.primary,
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

  // Session card
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sessionCardBreak: {
    backgroundColor: colors.muted,
  },

  // Type badge
  typeBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  sessionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  sessionDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },

  // Meta row
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewMapLink: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },

  // Speakers
  speakerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  speakerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  speakerName: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  speakerTitle: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
  },
  browseBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  browseBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
});
