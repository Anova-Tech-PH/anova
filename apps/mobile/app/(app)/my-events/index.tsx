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
import { useNavigation, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useAuth } from "../../../src/lib/auth-context";
import { JoinEventModal } from "../../../src/components/join-event-modal";
import { useEventContext } from "../../../src/lib/event-context";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  shared,
} from "../../../src/theme";

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
      return colors.success;
    case "pending":
      return colors.warning;
    case "cancelled":
      return colors.error;
    default:
      return colors.textMuted;
  }
}

function statusBgColor(status: string) {
  switch (status) {
    case "confirmed":
    case "checked_in":
      return colors.successSoft;
    case "pending":
      return colors.warningSoft;
    case "cancelled":
      return colors.errorSoft;
    default:
      return colors.overlay;
  }
}

export default function MyEventsScreen() {
  const { user } = useAuth();
  const { events, currentEvent, setCurrentEvent, isLoading } =
    useEventContext();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["my-events", user?.id] });
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Custom Header */}
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
        <Text style={styles.pageTitle}>My Events</Text>
        {events.length > 0 && (
          <Text style={styles.eventCount}>
            {events.length} {events.length === 1 ? "event" : "events"}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <FlatList
        data={events}
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
              name="ticket-outline"
              size={64}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptySubtitle}>
              Join an event using the code from your organizer
            </Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => setJoinModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.white} />
              <Text style={styles.joinButtonText}>Join with Event Code</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const event = item.events;
          if (!event) return null;

          const isSelected = currentEvent?.id === event.id;

          return (
            <TouchableOpacity
              style={[styles.card]}
              onPress={() => {
                setCurrentEvent(event);
                router.navigate("/(app)/home" as any);
              }}
              activeOpacity={0.7}
            >
              {/* Left accent bar for selected card */}
              {isSelected && (
                <View style={styles.accentBar} />
              )}

              <View style={styles.cardContent}>
                {/* Current badge */}
                {isSelected && (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.currentBadge}
                  >
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </LinearGradient>
                )}

                <Text style={styles.eventTitle}>{event.title}</Text>

                {/* Date row with icon */}
                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={colors.textMuted}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.metaText}>
                    {formatDate(event.start_date)}
                    {event.end_date && event.end_date !== event.start_date
                      ? ` - ${formatDate(event.end_date)}`
                      : ""}
                  </Text>
                </View>

                {/* Venue row with icon */}
                {event.venue_name && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.textMuted}
                      style={styles.metaIcon}
                    />
                    <Text style={styles.metaText}>{event.venue_name}</Text>
                  </View>
                )}

                {/* Virtual event row */}
                {event.is_virtual && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="videocam-outline"
                      size={14}
                      color={colors.textMuted}
                      style={styles.metaIcon}
                    />
                    <Text style={styles.metaText}>Virtual Event</Text>
                  </View>
                )}

                {/* Badges row */}
                <View style={styles.badgesRow}>
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
                      { backgroundColor: statusBgColor(item.status) },
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
              </View>
            </TouchableOpacity>
          );
        }}
      />
      )}
      {/* FAB for joining a new event */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setJoinModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
      <JoinEventModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
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
  eventCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    flexDirection: "row",
    ...shadows.md,
  },
  accentBar: {
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  cardContent: {
    flex: 1,
    padding: spacing.lg,
  },
  currentBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  currentBadgeText: {
    color: colors.white,
    ...typography.small,
  },
  eventTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  metaIcon: {
    marginRight: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "400",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  ticketBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  ticketBadgeText: {
    ...typography.small,
    color: colors.primary,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    ...typography.small,
    textTransform: "capitalize",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "400",
    marginTop: spacing.sm,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  joinButtonText: {
    ...typography.button,
    color: colors.white,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
});
