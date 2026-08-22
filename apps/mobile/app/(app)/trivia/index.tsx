import React, { useState, useMemo } from "react";
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
import { useRouter, useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getTriviaGames, getUserTriviaAttempt } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

// ── Types ────────────────────────────────────────────────────────
interface TriviaGame {
  id: string;
  title: string;
  description: string | null;
  question_count: number;
  time_limit_seconds: number | null;
  points_per_question: number | null;
  [key: string]: unknown;
}

interface TriviaAttempt {
  id: string;
  game_id: string;
  user_id: string;
  score: number | null;
  completed_at: string | null;
  [key: string]: unknown;
}

// ── Attempt Status ───────────────────────────────────────────────
type AttemptStatus = "not_started" | "in_progress" | "completed";

function getAttemptStatus(attempt: TriviaAttempt | null): AttemptStatus {
  if (!attempt) return "not_started";
  if (attempt.completed_at) return "completed";
  return "in_progress";
}

const STATUS_CONFIG: Record<
  AttemptStatus,
  { label: string; color: string; backgroundColor: string }
> = {
  not_started: {
    label: "Not Started",
    color: colors.textSecondary,
    backgroundColor: colors.borderLight,
  },
  in_progress: {
    label: "In Progress",
    color: "#b45309",
    backgroundColor: colors.warningSoft,
  },
  completed: {
    label: "Completed",
    color: colors.success,
    backgroundColor: colors.successSoft,
  },
};

// ── Game Card ────────────────────────────────────────────────────
function TriviaGameCard({
  game,
  onPress,
}: {
  game: TriviaGame;
  onPress: () => void;
}) {
  const { user } = useAuth();

  const { data: attempt = null } = useQuery({
    queryKey: ["trivia-attempt", game.id, user?.id],
    queryFn: () => getUserTriviaAttempt(supabase, game.id, user!.id),
    enabled: !!user?.id,
  });

  const status = getAttemptStatus(attempt);
  const config = STATUS_CONFIG[status];

  const statusLabel =
    status === "completed" && attempt
      ? `Completed — Score: ${attempt.score ?? 0}/${game.question_count}`
      : config.label;

  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="bulb-outline" size={22} color={colors.primary} />
        </View>
        <Badge
          label={statusLabel}
          color={config.color}
          backgroundColor={config.backgroundColor}
        />
      </View>

      <Text style={styles.gameTitle} numberOfLines={1}>
        {game.title}
      </Text>

      {game.description ? (
        <Text style={styles.gameDescription} numberOfLines={2}>
          {game.description}
        </Text>
      ) : null}

      <View style={styles.infoRows}>
        <View style={styles.infoRow}>
          <Ionicons
            name="help-circle-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={styles.infoText}>
            {game.question_count} question{game.question_count !== 1 ? "s" : ""}
          </Text>
        </View>

        {game.time_limit_seconds ? (
          <View style={styles.infoRow}>
            <Ionicons
              name="timer-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.infoText}>
              {game.time_limit_seconds} seconds per question
            </Text>
          </View>
        ) : null}

        {game.points_per_question ? (
          <View style={styles.infoRow}>
            <Ionicons name="star-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {game.points_per_question} points per correct answer
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function TriviaScreen() {
  const navigation = useNavigation();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ["trivia-games", currentEvent?.id],
    queryFn: () => getTriviaGames(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const filtered = useMemo(() => {
    if (!search) return games;
    const q = search.toLowerCase();
    return games.filter(
      (g: any) =>
        g.title?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q),
    );
  }, [games, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["trivia-games"] });
    await queryClient.invalidateQueries({ queryKey: ["trivia-attempt"] });
    setRefreshing(false);
  };

  const headerBlock = (
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
      <Text style={styles.pageTitle}>Trivia</Text>
    </View>
  );

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {headerBlock}
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
        {headerBlock}
        <View style={shared.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderGame = ({ item }: { item: TriviaGame }) => (
    <TriviaGameCard
      game={item}
      onPress={() => router.push(`/(app)/trivia/${item.id}` as any)}
    />
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {headerBlock}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search trivia games..."
      />
      <FlatList
        data={filtered}
        keyExtractor={(item: TriviaGame) => item.id}
        renderItem={renderGame}
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
            icon="bulb-outline"
            title="No trivia games found"
            subtitle={
              search
                ? "Try adjusting your search"
                : "No active trivia games for this event"
            }
          />
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  gameTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  gameDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  infoRows: {
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    ...typography.small,
    color: colors.textMuted,
  },
});
