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
import { Ionicons } from "@expo/vector-icons";
import { getMyNotes } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  shared,
} from "../../../src/theme";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncateContent(content: string, maxLength = 120) {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trimEnd() + "...";
}

export default function MyNotesScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["my-notes", currentEvent?.id, user?.id],
    queryFn: () => getMyNotes(supabase, currentEvent!.id, user!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["my-notes"] });
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

  const renderNote = ({ item }: { item: any }) => {
    const sessionTitle = item.sessions?.title ?? "Untitled Session";

    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() =>
          router.push(`/(app)/schedule/${item.session_id}` as any)
        }
        activeOpacity={0.7}
      >
        {/* Session title */}
        <View style={styles.sessionRow}>
          <Ionicons
            name="document-text-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {sessionTitle}
          </Text>
        </View>

        {/* Note content preview */}
        <Text style={styles.noteContent} numberOfLines={3}>
          {truncateContent(item.content)}
        </Text>

        {/* Footer with date */}
        <View style={styles.noteFooter}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.noteDate}>
            Updated {formatDate(item.updated_at)} at{" "}
            {formatTime(item.updated_at)}
          </Text>
          <View style={styles.chevronContainer}>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.textMuted}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <FlatList
        data={notes}
        keyExtractor={(item: any) => item.id}
        renderItem={renderNote}
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
            icon="create-outline"
            title="No notes yet"
            subtitle="Take notes on sessions from the schedule to see them here"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sessionTitle: {
    ...typography.bodyMedium,
    color: colors.primary,
    flex: 1,
  },
  noteContent: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  noteDate: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
  },
  chevronContainer: {
    paddingLeft: spacing.sm,
  },
});
