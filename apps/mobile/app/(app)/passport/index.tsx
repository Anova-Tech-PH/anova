import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getPassportSponsors,
  getPassportStamps,
  getPassportProgress,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

// ── Types ────────────────────────────────────────────────────────
interface Sponsor {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  booth_enabled: boolean;
  sort_order: number | null;
  tier: { id: string; name: string } | null;
}

interface Stamp {
  id: string;
  exhibitor_id: string;
  checked_in_at: string;
}

// ── Progress Header ──────────────────────────────────────────────
function ProgressHeader({
  collected,
  total,
}: {
  collected: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeaderRow}>
        <View style={styles.progressIconContainer}>
          <Ionicons name="compass" size={24} color={colors.primary} />
        </View>
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressTitle}>
            {collected} of {total} stamps collected
          </Text>
          <Text style={styles.progressPercentage}>{percentage}% complete</Text>
        </View>
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%` as any },
          ]}
        />
      </View>

      <Text style={styles.infoText}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        {"  "}Visit sponsor booths to collect stamps!
      </Text>
    </View>
  );
}

// ── Sponsor Card ─────────────────────────────────────────────────
function SponsorCard({
  sponsor,
  isStamped,
}: {
  sponsor: Sponsor;
  isStamped: boolean;
}) {
  return (
    <View
      style={[
        styles.sponsorCard,
        isStamped ? styles.sponsorCardStamped : styles.sponsorCardUnstamped,
      ]}
    >
      {/* Checkmark overlay */}
      {isStamped && (
        <View style={styles.checkmarkBadge}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        </View>
      )}

      {/* Logo or placeholder */}
      <View
        style={[
          styles.logoContainer,
          !isStamped && styles.logoContainerMuted,
        ]}
      >
        {sponsor.logo ? (
          <Image
            source={{ uri: sponsor.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Ionicons
            name="business-outline"
            size={32}
            color={isStamped ? colors.primary : colors.textMuted}
          />
        )}
      </View>

      {/* Sponsor name */}
      <Text
        style={[
          styles.sponsorName,
          !isStamped && styles.sponsorNameMuted,
        ]}
        numberOfLines={2}
      >
        {sponsor.name}
      </Text>

      {/* Tier label */}
      {sponsor.tier && (
        <Text style={styles.tierLabel} numberOfLines={1}>
          {Array.isArray(sponsor.tier)
            ? (sponsor.tier as any)[0]?.name
            : sponsor.tier.name}
        </Text>
      )}

      {/* Status label */}
      <View
        style={[
          styles.statusBadge,
          isStamped ? styles.statusBadgeStamped : styles.statusBadgeDefault,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            isStamped ? styles.statusTextStamped : styles.statusTextDefault,
          ]}
        >
          {isStamped ? "Collected" : "Not visited"}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function PassportScreen() {
  const { currentEvent } = useEventContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const eventId = currentEvent?.id;
  const userId = user?.id;

  const { data: sponsors = [], isLoading: sponsorsLoading } = useQuery({
    queryKey: ["passport-sponsors", eventId],
    queryFn: () => getPassportSponsors(supabase, eventId!),
    enabled: !!eventId,
  });

  const { data: stamps = [], isLoading: stampsLoading } = useQuery({
    queryKey: ["passport-stamps", eventId, userId],
    queryFn: () => getPassportStamps(supabase, eventId!, userId!),
    enabled: !!eventId && !!userId,
  });

  const { data: progress = { collected: 0, total: 0 } } = useQuery({
    queryKey: ["passport-progress", eventId, userId],
    queryFn: () => getPassportProgress(supabase, eventId!, userId!),
    enabled: !!eventId && !!userId,
  });

  const stampedIds = useMemo(() => {
    const set = new Set<string>();
    for (const stamp of stamps) {
      set.add((stamp as Stamp).exhibitor_id);
    }
    return set;
  }, [stamps]);

  const isLoading = sponsorsLoading || stampsLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["passport-sponsors"] }),
      queryClient.invalidateQueries({ queryKey: ["passport-stamps"] }),
      queryClient.invalidateQueries({ queryKey: ["passport-progress"] }),
    ]);
    setRefreshing(false);
  };

  // ── No event selected ───────────────────────────────────────────
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

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  const renderSponsor = ({ item }: { item: Sponsor }) => (
    <SponsorCard sponsor={item} isStamped={stampedIds.has(item.id)} />
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <FlatList
        data={sponsors as Sponsor[]}
        keyExtractor={(item: Sponsor) => item.id}
        renderItem={renderSponsor}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <ProgressHeader
            collected={progress.collected}
            total={progress.total}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="compass-outline"
            title="No sponsor booths"
            subtitle="No exhibitor passport booths are available for this event yet"
          />
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Progress header
  progressContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  progressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  progressPercentage: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    minWidth: 0,
  },
  infoText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Grid
  gridRow: {
    justifyContent: "space-between",
    gap: spacing.md,
  },

  // Sponsor card
  sponsorCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    alignItems: "center",
    position: "relative",
    ...shadows.sm,
  },
  sponsorCardStamped: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  sponsorCardUnstamped: {
    borderColor: colors.borderLight,
    opacity: 0.7,
  },

  // Checkmark
  checkmarkBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },

  // Logo
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  logoContainerMuted: {
    backgroundColor: colors.borderLight,
  },
  logo: {
    width: 56,
    height: 56,
  },

  // Text
  sponsorName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  sponsorNameMuted: {
    color: colors.textMuted,
  },
  tierLabel: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },

  // Status badge
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeStamped: {
    backgroundColor: colors.successSoft,
  },
  statusBadgeDefault: {
    backgroundColor: colors.borderLight,
  },
  statusText: {
    ...typography.small,
    textAlign: "center",
  },
  statusTextStamped: {
    color: colors.success,
  },
  statusTextDefault: {
    color: colors.textMuted,
  },
});
