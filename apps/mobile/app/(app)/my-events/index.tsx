import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusColor(status: string) {
  switch (status) {
    case "confirmed":
    case "checked_in":
      return "#16a34a";
    case "pending":
      return "#f59e0b";
    case "cancelled":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

export default function MyEventsScreen() {
  const { user } = useAuth();
  const { events, currentEvent, setCurrentEvent, isLoading } =
    useEventContext();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["my-events", user?.id] });
    setRefreshing(false);
  };

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
        data={events}
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
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptySubtitle}>
              Register for events to see them here
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const event = item.events;
          if (!event) return null;

          const isSelected = currentEvent?.id === event.id;

          return (
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setCurrentEvent(event)}
              activeOpacity={0.7}
            >
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Current</Text>
                </View>
              )}
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.meta}>
                {formatDate(event.start_date)}
                {event.end_date && event.end_date !== event.start_date
                  ? ` - ${formatDate(event.end_date)}`
                  : ""}
              </Text>
              {event.venue_name && (
                <Text style={styles.meta}>{event.venue_name}</Text>
              )}
              {event.is_virtual && (
                <Text style={styles.meta}>Virtual Event</Text>
              )}
              <View style={styles.row}>
                {item.ticket_types?.name && (
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketBadgeText}>
                      {item.ticket_types.name}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor(item.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: statusColor(item.status) },
                    ]}
                  >
                    {item.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
  cardSelected: {
    borderColor: "#0d7377",
    borderWidth: 2,
  },
  selectedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0d7377",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  selectedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2e05",
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  ticketBadge: {
    backgroundColor: "#0d737715",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ticketBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0d7377",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
