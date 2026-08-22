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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
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

function truncateContent(content: string, maxLength = 140) {
  // Strip HTML tags for preview
  const plain = content.replace(/<[^>]*>/g, "").trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trimEnd() + "...";
}

function groupByDate(notes: any[]) {
  const groups: { title: string; data: any[] }[] = [];
  const map = new Map<string, any[]>();

  for (const note of notes) {
    const key = formatDate(note.updated_at);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(note);
  }

  for (const [title, data] of map) {
    groups.push({ title, data });
  }

  return groups;
}

export default function MyNotesScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["my-notes", currentEvent?.id, user?.id],
    queryFn: () => getMyNotes(supabase, currentEvent!.id, user!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const filteredNotes = useMemo(() => {
    if (!search) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n: any) =>
        n.content?.toLowerCase().includes(q) ||
        n.sessions?.title?.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const grouped = useMemo(() => groupByDate(filteredNotes), [filteredNotes]);

  // Flatten grouped data for FlatList with section headers
  const flatData = useMemo(() => {
    const items: { type: "header" | "note"; data: any; key: string }[] = [];
    for (const group of grouped) {
      items.push({ type: "header", data: group.title, key: `header-${group.title}` });
      for (const note of group.data) {
        items.push({ type: "note", data: note, key: note.id });
      }
    }
    return items;
  }, [grouped]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["my-notes"] });
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
        <Text style={styles.pageTitle}>My Notes</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/schedule" as any)}
          style={styles.scheduleBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.scheduleBtnText}>Go to schedule</Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
      {notes.length > 0 && (
        <Text style={styles.noteCount}>
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </Text>
      )}
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

  const renderNote = ({ item }: { item: any }) => {
    const sessionTitle = item.sessions?.title ?? "Untitled Session";
    const preview = truncateContent(item.content ?? "");
    const sessionTime = item.sessions?.start_time;

    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() =>
          router.push(`/(app)/schedule/${item.session_id}` as any)
        }
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.noteBody}>
          {/* Session title */}
          <View style={styles.sessionRow}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color={colors.primary}
            />
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {sessionTitle}
            </Text>
          </View>

          {/* Note content preview */}
          {preview ? (
            <Text style={styles.noteContent} numberOfLines={3}>
              {preview}
            </Text>
          ) : (
            <Text style={styles.noteContentEmpty}>Empty note</Text>
          )}

          {/* Footer with session time + last updated */}
          <View style={styles.noteFooter}>
            {sessionTime && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={11}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {formatDate(sessionTime)} {formatTime(sessionTime)}
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons
                name="create-outline"
                size={11}
                color={colors.textMuted}
              />
              <Text style={styles.metaText}>
                Edited {formatTime(item.updated_at)}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
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

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}

      {/* Search */}
      {notes.length > 0 && (
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
              placeholder="Search notes..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={flatData}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return renderSectionHeader(item.data);
          }
          return renderNote({ item: item.data });
        }}
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
              icon="create-outline"
              title="No notes yet"
              subtitle="Take notes on sessions from the schedule to see them here"
            />
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push("/(app)/schedule" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.browseBtnText}>Browse schedule</Text>
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
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scheduleBtnText: {
    fontSize: 14,
    color: colors.primary,
  },
  noteCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
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

  // Section headers
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Note card
  noteCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    ...shadows.sm,
  },
  accentBar: {
    width: 3,
    backgroundColor: colors.primary,
  },
  noteBody: {
    flex: 1,
    padding: spacing.md,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    flex: 1,
  },
  noteContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  noteContentEmpty: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11,
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
