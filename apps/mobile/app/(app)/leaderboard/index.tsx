import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getLeaderboard, getUserPointSummary } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", currentEvent?.id],
    queryFn: () => getLeaderboard(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: userSummary } = useQuery({
    queryKey: ["user-point-summary", currentEvent?.id, user?.id],
    queryFn: () => getUserPointSummary(supabase, currentEvent!.id, user!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    await queryClient.invalidateQueries({ queryKey: ["user-point-summary"] });
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

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return colors.textMuted;
  };

  const renderItem = ({ item }: { item: any }) => {
    const isCurrentUser = user?.id === item.user_id;

    return (
      <View style={[styles.rankCard, isCurrentUser && styles.rankCardHighlight]}>
        <View style={styles.rankCol}>
          {item.rank <= 3 ? (
            <Ionicons name="trophy" size={20} color={getMedalColor(item.rank)} />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>
        <Avatar name={item.full_name} size={40} photoUrl={item.avatar_url} />
        <View style={styles.nameCol}>
          <Text style={styles.playerName} numberOfLines={1}>
            {item.full_name ?? "Anonymous"}
            {isCurrentUser ? " (You)" : ""}
          </Text>
          <Text style={styles.challengeText}>
            {item.challenges_completed} challenge{item.challenges_completed !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.pointsCol}>
          <Text style={styles.pointsValue}>{item.total_points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* User summary card */}
      {userSummary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            <Text style={styles.summaryValue}>#{userSummary.rank}</Text>
            <Text style={styles.summaryLabel}>Your Rank</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="star-outline" size={20} color={colors.primary} />
            <Text style={styles.summaryValue}>{userSummary.totalPoints}</Text>
            <Text style={styles.summaryLabel}>Points</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.summaryValue}>{userSummary.challengesCompleted}</Text>
            <Text style={styles.summaryLabel}>Challenges</Text>
          </View>
        </View>
      )}

      <FlatList
        data={leaderboard ?? []}
        keyExtractor={(item: any) => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="No rankings yet"
            subtitle="Participate in challenges to earn points and climb the leaderboard"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  rankCard: {
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
  rankCardHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  rankCol: {
    width: 30,
    alignItems: "center",
  },
  rankNumber: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  nameCol: {
    flex: 1,
  },
  playerName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  challengeText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  pointsCol: {
    alignItems: "center",
  },
  pointsValue: {
    ...typography.h3,
    color: colors.primary,
  },
  pointsLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
});
