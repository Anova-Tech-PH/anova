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
      return { text: "Open", color: "#16a34a" };
    case "full":
      return { text: "Full", color: "#f59e0b" };
    case "closed":
      return { text: "Closed", color: "#ef4444" };
    default:
      return { text: status, color: "#6b7280" };
  }
}

export default function RoomsScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: rooms,
    isLoading,
  } = useQuery({
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
        <Text style={styles.emptyTitle}>Select an event from My Events</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#0d7377" />
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
            tintColor="#0d7377"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
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

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.roomTitle}>{item.title}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: status.color + "20" },
                  ]}
                >
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.text}
                  </Text>
                </View>
              </View>

              {item.description && (
                <Text style={styles.meta} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {item.facilitator && (
                <Text style={styles.meta}>Host: {item.facilitator}</Text>
              )}

              {item.location && (
                <Text style={styles.meta}>Location: {item.location}</Text>
              )}

              {(item.starts_at || item.ends_at) && (
                <Text style={styles.meta}>
                  {item.starts_at ? formatTime(item.starts_at) : ""}
                  {item.starts_at && item.ends_at ? " - " : ""}
                  {item.ends_at ? formatTime(item.ends_at) : ""}
                </Text>
              )}

              <View style={styles.footerRow}>
                <Text style={styles.meta}>
                  {participantCount}
                  {item.max_capacity ? ` / ${item.max_capacity}` : ""}{" "}
                  participants
                </Text>

                {item.status !== "closed" && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      hasJoined ? styles.leaveButton : styles.joinButton,
                    ]}
                    onPress={() =>
                      hasJoined
                        ? leaveMutation.mutate(item.id)
                        : joinMutation.mutate(item.id)
                    }
                    disabled={
                      isMutating ||
                      (!hasJoined && item.status === "full")
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        hasJoined && styles.leaveButtonText,
                      ]}
                    >
                      {hasJoined ? "Leave" : "Join"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8faf5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8faf5",
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  roomTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2e05",
    flex: 1,
    marginRight: 8,
  },
  meta: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 2,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  joinButton: {
    backgroundColor: "#0d7377",
  },
  leaveButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  leaveButtonText: {
    color: "#ef4444",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2e05",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
});
