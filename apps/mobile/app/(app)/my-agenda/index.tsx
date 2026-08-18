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
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getMyAgendaSessions,
  toggleSessionBookmark,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  shared,
} from "../../../src/theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function MyAgendaScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
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

  const renderSession = ({ item }: { item: any }) => {
    const speakers = (item.session_speakers ?? [])
      .map((ss: any) => ss.speakers)
      .filter(Boolean);

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => router.push(`/(app)/schedule/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{formatTime(item.start_time)}</Text>
          <Text style={styles.endTimeText}>{formatTime(item.end_time)}</Text>
          <Text style={styles.dateText}>{formatDate(item.start_time)}</Text>
        </View>
        <View style={styles.sessionContent}>
          <Text style={styles.sessionTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Speakers */}
          {speakers.length > 0 && (
            <View style={styles.speakerRow}>
              {speakers.slice(0, 3).map((sp: any) => (
                <View key={sp.id} style={styles.speakerChip}>
                  <Avatar name={sp.name} size={20} />
                  <Text style={styles.speakerName} numberOfLines={1}>
                    {sp.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}
        </View>

        {/* Remove bookmark button */}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeMutation.mutate({ sessionId: item.id })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="bookmark" size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search bookmarked sessions..."
      />

      <FlatList
        data={filteredSessions}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSession}
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
            icon="bookmark-outline"
            title="No bookmarked sessions"
            subtitle="Bookmark sessions from the schedule to add them to your agenda"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sessionCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  timeCol: {
    width: 60,
    paddingTop: 2,
  },
  timeText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  endTimeText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sessionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  speakerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  speakerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  speakerName: {
    ...typography.small,
    color: colors.textSecondary,
    maxWidth: 80,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    ...typography.small,
    color: colors.textMuted,
  },
  removeBtn: {
    paddingLeft: spacing.sm,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
});
