import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getLeaderboard,
  getUserPointSummary,
  getUserBadges,
  getChallengeProgress,
  getBadgeDefinitions,
  getGamificationConfig,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
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

// ── Activity-type label helper ──────────────────────────────────
const ACTIVITY_LABELS: Record<string, string> = {
  session_attend: "Attend Sessions",
  poll_vote: "Vote in Polls",
  feedback_submit: "Submit Feedback",
  photo_upload: "Upload Photos",
  community_post: "Community Posts",
  profile_complete: "Complete Profile",
  referral: "Refer Attendees",
  check_in: "Check In",
  networking: "Network",
  trivia_play: "Play Trivia",
};

function formatActivityType(type: string): string {
  return ACTIVITY_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Icon mapping for activity types ─────────────────────────────
function getActivityIcon(type: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    session_attend: "calendar",
    poll_vote: "stats-chart",
    feedback_submit: "chatbox-ellipses",
    photo_upload: "camera",
    community_post: "people",
    profile_complete: "person-circle",
    referral: "share-social",
    check_in: "location",
    networking: "git-network",
    trivia_play: "game-controller",
  };
  return map[type] ?? "ellipse";
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);

  const eventId = currentEvent?.id;
  const userId = user?.id;

  // ── Queries ────────────────────────────────────────────────────
  const { data: config } = useQuery({
    queryKey: ["gamification-config", eventId],
    queryFn: () => getGamificationConfig(supabase, eventId!),
    enabled: !!eventId,
  });

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", eventId],
    queryFn: () => getLeaderboard(supabase, eventId!),
    enabled: !!eventId,
  });

  const { data: userSummary } = useQuery({
    queryKey: ["user-point-summary", eventId, userId],
    queryFn: () => getUserPointSummary(supabase, eventId!, userId!),
    enabled: !!eventId && !!userId,
  });

  const { data: userBadges } = useQuery({
    queryKey: ["user-badges", eventId, userId],
    queryFn: () => getUserBadges(supabase, eventId!, userId!),
    enabled: !!eventId && !!userId,
  });

  const { data: allBadges } = useQuery({
    queryKey: ["badge-definitions", eventId],
    queryFn: () => getBadgeDefinitions(supabase, eventId!),
    enabled: !!eventId,
  });

  const { data: challenges } = useQuery({
    queryKey: ["challenge-progress", eventId, userId],
    queryFn: () => getChallengeProgress(supabase, eventId!, userId!),
    enabled: !!eventId && !!userId,
  });

  // ── Refresh ────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    await queryClient.invalidateQueries({ queryKey: ["user-point-summary"] });
    await queryClient.invalidateQueries({ queryKey: ["user-badges"] });
    await queryClient.invalidateQueries({ queryKey: ["badge-definitions"] });
    await queryClient.invalidateQueries({ queryKey: ["challenge-progress"] });
    await queryClient.invalidateQueries({ queryKey: ["gamification-config"] });
    setRefreshing(false);
  }, [queryClient]);

  // ── Share / Referral ───────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const eventName = currentEvent?.title ?? "our event";
    const message = `Join me at ${eventName}! I'm currently ranked #${userSummary?.rank ?? "?"} on the leaderboard with ${userSummary?.totalPoints ?? 0} points. Come compete and earn prizes!`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  }, [currentEvent?.title, userSummary]);

  // ── Derived data ───────────────────────────────────────────────
  const earnedBadgeIds = new Set(
    (userBadges ?? []).map((b: any) => b.badge_id as string)
  );

  const enabledChallenges = (challenges ?? []).filter((c: any) => c.enabled);

  const totalMaxPoints = enabledChallenges.reduce((sum: number, c: any) => {
    const max = c.maxPerEvent ?? 1;
    return sum + max * c.pointsPerAction;
  }, 0);

  const completionPct =
    totalMaxPoints > 0 && userSummary
      ? Math.min(100, Math.round((userSummary.totalPoints / totalMaxPoints) * 100))
      : 0;

  // ── Guards ─────────────────────────────────────────────────────
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

  // ── Helpers ────────────────────────────────────────────────────
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return colors.textMuted;
  };

  // ── Render helpers ─────────────────────────────────────────────
  const renderLeaderboardItem = ({ item }: { item: any }) => {
    const isCurrentUser = userId === item.user_id;
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
            {item.challenges_completed} challenge
            {item.challenges_completed !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.pointsCol}>
          <Text style={styles.pointsValue}>{item.total_points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  // ── Header (prize banner + my stats + badges + challenges + share) ──
  const renderHeader = () => (
    <View>
      {/* Prize Banner */}
      {config?.prizes_description ? (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.prizeBanner}
        >
          <Ionicons name="gift" size={24} color={colors.white} />
          <View style={styles.prizeBannerText}>
            <Text style={styles.prizeBannerTitle}>Prize Up for Grabs</Text>
            <Text style={styles.prizeBannerDesc}>{config.prizes_description}</Text>
          </View>
        </LinearGradient>
      ) : null}

      {/* My Points Panel */}
      {userSummary && (
        <View style={styles.myPointsCard}>
          <View style={styles.myPointsHeader}>
            <Ionicons name="person" size={18} color={colors.primary} />
            <Text style={styles.myPointsTitle}>Your Progress</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>#{userSummary.rank}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userSummary.totalPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{completionPct}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>
          {/* Overall progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${completionPct}%` }]}
            />
          </View>
        </View>
      )}

      {/* Badges Section */}
      {(allBadges ?? []).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="ribbon" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.sectionCount}>
              {earnedBadgeIds.size}/{(allBadges ?? []).length}
            </Text>
          </View>
          <View style={styles.badgeGrid}>
            {(allBadges ?? []).map((badge: any) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              return (
                <View key={badge.id} style={styles.badgeItem}>
                  <View
                    style={[
                      styles.badgeCircle,
                      isEarned ? styles.badgeCircleEarned : styles.badgeCircleUnearned,
                    ]}
                  >
                    <Ionicons
                      name={(badge.icon ?? "star") as any}
                      size={24}
                      color={isEarned ? colors.primary : colors.textMuted}
                    />
                    {isEarned && (
                      <View style={styles.badgeCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.badgeName,
                      !isEarned && styles.badgeNameMuted,
                    ]}
                    numberOfLines={2}
                  >
                    {badge.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Challenges Section */}
      {enabledChallenges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flag" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Challenges</Text>
          </View>
          {enabledChallenges.map((challenge: any) => {
            const max = challenge.maxPerEvent ?? 1;
            const count = Math.min(challenge.count, max);
            const pct = max > 0 ? Math.round((count / max) * 100) : 0;
            const isComplete = count >= max;
            const isExpanded = expandedChallenge === challenge.activityType;

            return (
              <Pressable
                key={challenge.activityType}
                style={styles.challengeCard}
                onPress={() =>
                  setExpandedChallenge(
                    isExpanded ? null : challenge.activityType
                  )
                }
              >
                <View style={styles.challengeHeader}>
                  <Ionicons
                    name={getActivityIcon(challenge.activityType)}
                    size={20}
                    color={isComplete ? colors.success : colors.primary}
                  />
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>
                      {formatActivityType(challenge.activityType)}
                    </Text>
                    <Text style={styles.challengeCount}>
                      {count}/{max}
                      {isComplete ? " -- Done!" : ""}
                    </Text>
                  </View>
                  <View style={styles.challengePoints}>
                    <Text style={styles.challengePointsText}>
                      +{challenge.pointsPerAction}
                    </Text>
                    <Text style={styles.challengePointsLabel}>pts each</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
                {/* Progress bar */}
                <View style={styles.challengeTrack}>
                  <View
                    style={[
                      styles.challengeFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: isComplete
                          ? colors.success
                          : colors.primary,
                      },
                    ]}
                  />
                </View>
                {/* Expanded details */}
                {isExpanded && (
                  <View style={styles.challengeDetails}>
                    <Text style={styles.challengeDetailText}>
                      Earn {challenge.pointsPerAction} point
                      {challenge.pointsPerAction !== 1 ? "s" : ""} each time
                      (max {max} time{max !== 1 ? "s" : ""}).
                    </Text>
                    <Text style={styles.challengeDetailText}>
                      Total possible: {max * challenge.pointsPerAction} pts
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Referral / Share Button */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social" size={20} color={colors.white} />
        <Text style={styles.shareButtonText}>Invite Friends & Earn Points</Text>
      </TouchableOpacity>

      {/* Rankings header */}
      <View style={styles.rankingsHeader}>
        <Ionicons name="trophy" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>
          {config?.leaderboard_title ?? "Rankings"}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <FlatList
        data={leaderboard ?? []}
        keyExtractor={(item: any) => item.user_id}
        renderItem={renderLeaderboardItem}
        ListHeaderComponent={renderHeader}
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
            icon="trophy-outline"
            title="No rankings yet"
            subtitle="Participate in challenges to earn points and climb the leaderboard"
          />
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Prize Banner
  prizeBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  prizeBannerText: {
    flex: 1,
  },
  prizeBannerTitle: {
    ...typography.captionBold,
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prizeBannerDesc: {
    ...typography.body,
    color: colors.white,
    marginTop: 2,
  },

  // My Points Card
  myPointsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  myPointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  myPointsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.md,
  },
  statBox: {
    alignItems: "center",
    gap: spacing.xs,
  },
  statNumber: {
    ...typography.h1,
    color: colors.primary,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  // Sections
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  badgeItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  badgeCircleEarned: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeCircleUnearned: {
    backgroundColor: colors.borderLight,
    borderWidth: 2,
    borderColor: colors.border,
    opacity: 0.5,
  },
  badgeCheck: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  badgeName: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },
  badgeNameMuted: {
    color: colors.textMuted,
    opacity: 0.6,
  },

  // Challenges
  challengeCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  challengeCount: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 1,
  },
  challengePoints: {
    alignItems: "center",
    marginRight: spacing.xs,
  },
  challengePointsText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  challengePointsLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 9,
  },
  challengeTrack: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  challengeFill: {
    height: 4,
    borderRadius: 2,
  },
  challengeDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  challengeDetailText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },

  // Share Button
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  shareButtonText: {
    ...typography.button,
    color: colors.white,
  },

  // Rankings Header
  rankingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  // Leaderboard Items (kept from original)
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
