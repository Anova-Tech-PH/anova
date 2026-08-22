import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import {
  getConversations,
  searchAttendees,
  createDmConversationMutation,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
// SearchBar replaced with inline custom header + search
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
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [composeVisible, setComposeVisible] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => getConversations(supabase, user!.id),
    enabled: !!user?.id,
  });

  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["search-attendees", currentEvent?.id, attendeeSearch],
    queryFn: () => searchAttendees(supabase, currentEvent!.id, attendeeSearch),
    enabled: !!currentEvent?.id && attendeeSearch.length >= 2,
  });

  const createDmMutation = useMutation({
    mutationFn: (otherUserId: string) =>
      createDmConversationMutation(supabase, currentEvent!.id, otherUserId),
    onSuccess: (result) => {
      setComposeVisible(false);
      setAttendeeSearch("");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/(app)/messages/${result.id}` as any);
    },
  });

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c: any) =>
      c.display_name?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setRefreshing(false);
  };

  const handleSelectAttendee = useCallback(
    (attendee: any) => {
      // Check if conversation already exists with this attendee
      const existing = conversations.find((c: any) => {
        const members = c.conversation_members as any[];
        return (
          !c.is_group &&
          members?.some((m: any) => m.user_id === attendee.id)
        );
      });

      if (existing) {
        setComposeVisible(false);
        setAttendeeSearch("");
        router.push(`/(app)/messages/${existing.id}` as any);
      } else {
        createDmMutation.mutate(attendee.id);
      }
    },
    [conversations, createDmMutation, router],
  );

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
      <Text style={styles.pageTitle}>Messages</Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <EmptyState
            icon="log-in-outline"
            title="Sign in required"
            subtitle="Sign in to view your messages"
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

  const renderAttendeeResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.attendeeCard}
      onPress={() => handleSelectAttendee(item)}
      activeOpacity={0.7}
      disabled={createDmMutation.isPending}
    >
      <Avatar name={item.full_name} size={44} uri={item.avatar_url} />
      <View style={styles.attendeeInfo}>
        <Text style={styles.attendeeName} numberOfLines={1}>
          {item.full_name}
        </Text>
        {(item.title || item.company) && (
          <Text style={styles.attendeeDetail} numberOfLines={1}>
            {[item.title, item.company].filter(Boolean).join(" at ")}
          </Text>
        )}
      </View>
      <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

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
            placeholder="Search conversations..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>
      <FlatList
        data={filteredConversations}
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
            title={searchQuery ? "No matches" : "No messages yet"}
            subtitle={
              searchQuery
                ? "Try a different search term"
                : "Tap the + button to start a conversation"
            }
          />
        }
      />

      {/* Compose FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setComposeVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* Compose Modal */}
      <Modal
        visible={composeVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setComposeVisible(false);
          setAttendeeSearch("");
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Message</Text>
            <TouchableOpacity
              onPress={() => {
                setComposeVisible(false);
                setAttendeeSearch("");
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchWrapper}>
            <View style={styles.modalSearchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={colors.textMuted}
                style={styles.modalSearchIcon}
              />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search attendees by name..."
                placeholderTextColor={colors.textMuted}
                value={attendeeSearch}
                onChangeText={setAttendeeSearch}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>
          </View>

          {createDmMutation.isPending && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Starting conversation...</Text>
            </View>
          )}

          {attendeeSearch.length < 2 ? (
            <View style={styles.searchHint}>
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.searchHintText}>
                Type at least 2 characters to search
              </Text>
            </View>
          ) : isSearching ? (
            <View style={styles.searchHint}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={searchResults.filter((a: any) => a.id !== user.id)}
              keyExtractor={(item: any) => item.id}
              renderItem={renderAttendeeResult}
              contentContainerStyle={styles.attendeeList}
              ListEmptyComponent={
                <EmptyState
                  icon="person-outline"
                  title="No attendees found"
                  subtitle="Try a different name"
                />
              }
            />
          )}
        </SafeAreaView>
      </Modal>
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSearchWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  modalSearchIcon: {
    marginRight: spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 14,
    ...typography.body,
    color: colors.textPrimary,
  },
  loadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  searchHint: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: 80,
  },
  searchHintText: {
    ...typography.body,
    color: colors.textMuted,
  },
  attendeeList: {
    padding: spacing.lg,
  },
  attendeeCard: {
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
  attendeeInfo: {
    flex: 1,
    gap: 2,
  },
  attendeeName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  attendeeDetail: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
