import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoomsByEvent,
  joinRoomMutation,
  leaveRoomMutation,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  shared,
} from "../../../src/theme";

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return {
        text: "Open",
        color: colors.success,
        bg: colors.successSoft,
      };
    case "full":
      return {
        text: "Full",
        color: colors.warning,
        bg: colors.warningSoft,
      };
    case "closed":
      return {
        text: "Closed",
        color: colors.error,
        bg: colors.errorSoft,
      };
    default:
      return {
        text: status,
        color: colors.textMuted,
        bg: colors.overlay,
      };
  }
}

export default function RoomsScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms", currentEvent?.id],
    queryFn: () => getRoomsByEvent(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const joinMutation = useMutation({
    mutationFn: (roomId: string) =>
      joinRoomMutation(supabase, roomId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", currentEvent?.id] });
    },
    onError: (err: Error) => {
      Alert.alert("Cannot Join", err.message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (roomId: string) =>
      leaveRoomMutation(supabase, roomId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", currentEvent?.id] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: ["rooms", currentEvent?.id],
    });
    setRefreshing(false);
  };

  if (!currentEvent) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <Ionicons
          name="calendar-outline"
          size={64}
          color={colors.textMuted}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>Select an event from My Events</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={rooms ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="grid-outline"
              size={64}
              color={colors.textMuted}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No rooms available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for breakout rooms
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const participants = item.breakout_room_participants ?? [];
          const participantCount = participants.length;
          const hasJoined = participants.some(
            (p: { user_id: string }) => p.user_id === user?.id
          );
          const status = statusLabel(item.status);
          const isMutating =
            joinMutation.isPending || leaveMutation.isPending;
          const capacityRatio =
            item.max_capacity && item.max_capacity > 0
              ? Math.min(participantCount / item.max_capacity, 1)
              : null;

          return (
            <View style={styles.card}>
              {/* Header: Title + Status Badge */}
              <View style={styles.cardHeader}>
                <Text style={styles.roomTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.text}
                  </Text>
                </View>
              </View>

              {/* Description */}
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {/* Meta Grid */}
              <View style={styles.metaGrid}>
                {item.facilitator && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="person-outline"
                      size={15}
                      color={colors.textMuted}
                      style={styles.metaIcon}
                    />
                    <Text style={styles.metaText}>{item.facilitator}</Text>
                  </View>
                )}

                {item.location && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={colors.textMuted}
                      style={styles.metaIcon}
                    />
                    <Text style={styles.metaText}>{item.location}</Text>
                  </View>
                )}

                {(item.starts_at || item.ends_at) && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={colors.textMuted}
                      style={styles.metaIcon}
                    />
                    <Text style={styles.metaText}>
                      {item.starts_at ? formatTime(item.starts_at) : ""}
                      {item.starts_at && item.ends_at ? " - " : ""}
                      {item.ends_at ? formatTime(item.ends_at) : ""}
                    </Text>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Participant count + capacity bar */}
              <View style={styles.capacitySection}>
                <View style={styles.metaRow}>
                  <Ionicons
                    name="people-outline"
                    size={15}
                    color={colors.textSecondary}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.participantText}>
                    {participantCount}
                    {item.max_capacity ? ` / ${item.max_capacity}` : ""}{" "}
                    participants
                  </Text>
                </View>

                {capacityRatio !== null && (
                  <View style={styles.capacityBarBg}>
                    <View
                      style={[
                        styles.capacityBarFill,
                        {
                          width: `${Math.round(capacityRatio * 100)}%`,
                          backgroundColor:
                            capacityRatio >= 1
                              ? colors.error
                              : capacityRatio >= 0.75
                              ? colors.warning
                              : colors.primary,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              {/* Action Button */}
              {item.status !== "closed" && (
                <View style={styles.actionRow}>
                  {hasJoined ? (
                    <TouchableOpacity
                      style={styles.leaveButton}
                      onPress={() => leaveMutation.mutate(item.id)}
                      disabled={isMutating}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.leaveButtonText}>Leave</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => joinMutation.mutate(item.id)}
                      disabled={isMutating || item.status === "full"}
                      activeOpacity={0.7}
                      style={styles.joinButtonWrapper}
                    >
                      <LinearGradient
                        colors={[colors.gradientStart, colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.joinButton,
                          (isMutating || item.status === "full") &&
                            styles.buttonDisabled,
                        ]}
                      >
                        <Text style={styles.joinButtonText}>Join</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shared.screen,
  },
  centered: {
    ...shared.centered,
  },
  list: {
    ...shared.listContent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  roomTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
  },
  statusBadge: {
    ...shared.badge,
  },
  statusText: {
    ...typography.small,
    textTransform: "capitalize",
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  metaGrid: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: spacing.sm,
    width: 18,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  capacitySection: {
    gap: spacing.sm,
  },
  participantText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  capacityBarBg: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  capacityBarFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  actionRow: {
    marginTop: spacing.lg,
  },
  joinButtonWrapper: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  joinButton: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: {
    color: colors.white,
    ...typography.button,
  },
  leaveButton: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  leaveButtonText: {
    color: colors.error,
    ...typography.button,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
