import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getTriviaGameDetail,
  getTriviaQuestions,
  getUserTriviaAttempt,
  getTriviaLeaderboard,
  startTriviaAttempt,
  submitTriviaAnswer,
  completeTriviaAttempt,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

// ── Types ─────────────────────────────────────────────────────────
interface TriviaGame {
  id: string;
  title: string;
  description: string | null;
  time_limit_seconds: number | null;
  points_per_question: number | null;
  status: string;
  [key: string]: unknown;
}

interface TriviaQuestion {
  id: string;
  game_id: string;
  question_text: string;
  options: string[];
  sort_order: number;
}

interface TriviaAttempt {
  id: string;
  game_id: string;
  user_id: string;
  score: number | null;
  total_time_ms: number | null;
  completed_at: string | null;
  [key: string]: unknown;
}

interface LeaderboardEntry {
  id: string;
  user_id: string;
  score: number | null;
  total_time_ms: number | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

type Phase = "pre" | "playing" | "results";

const OPTION_LETTERS = ["A", "B", "C", "D"];
const FEEDBACK_DELAY_MS = 1500;
const LOW_TIME_THRESHOLD = 5;

// ── Main Screen ───────────────────────────────────────────────────
export default function TriviaGameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Game state ───────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("pre");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Queries ──────────────────────────────────────────────────
  const { data: game = null, isLoading: gameLoading } = useQuery({
    queryKey: ["trivia-game-detail", gameId],
    queryFn: () => getTriviaGameDetail(supabase, gameId!),
    enabled: !!gameId,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["trivia-questions", gameId],
    queryFn: () => getTriviaQuestions(supabase, gameId!),
    enabled: !!gameId,
  });

  const { data: existingAttempt = null, isLoading: attemptLoading } = useQuery({
    queryKey: ["trivia-attempt", gameId, user?.id],
    queryFn: () => getUserTriviaAttempt(supabase, gameId!, user!.id),
    enabled: !!gameId && !!user?.id,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["trivia-leaderboard", gameId],
    queryFn: () => getTriviaLeaderboard(supabase, gameId!),
    enabled: !!gameId && phase === "results",
  });

  // ── Mutations ────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: () => startTriviaAttempt(supabase, { gameId: gameId!, userId: user!.id }),
    onSuccess: (data) => {
      setAttemptId(data.id);
      setPhase("playing");
      setStartTime(Date.now());
      setCurrentQuestionIndex(0);
      setScore(0);
      if (game?.time_limit_seconds) {
        setTimeLeft(game.time_limit_seconds);
      }
    },
  });

  const answerMutation = useMutation({
    mutationFn: (params: { questionId: string; selectedOption: number }) =>
      submitTriviaAnswer(supabase, {
        gameId: gameId!,
        questionId: params.questionId,
        userId: user!.id,
        selectedOption: params.selectedOption,
      }),
  });

  const completeMutation = useMutation({
    mutationFn: (params: { score: number; totalTimeMs: number }) =>
      completeTriviaAttempt(supabase, attemptId!, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trivia-attempt", gameId] });
      queryClient.invalidateQueries({ queryKey: ["trivia-leaderboard", gameId] });
    },
  });

  // ── Header ───────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      title: game?.title ?? "Trivia",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, game?.title]);

  // ── Determine initial phase from existing attempt ────────────
  useEffect(() => {
    if (attemptLoading) return;
    if (existingAttempt?.completed_at) {
      setAttemptId(existingAttempt.id);
      setScore(existingAttempt.score ?? 0);
      setPhase("results");
    } else if (existingAttempt && !existingAttempt.completed_at) {
      // For MVP, treat incomplete attempts as needing a fresh start
      setPhase("pre");
    }
  }, [existingAttempt, attemptLoading]);

  // ── Timer logic ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || !game?.time_limit_seconds) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Time's up — auto-advance
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentQuestionIndex, game?.time_limit_seconds]);

  // ── Progress bar animation ───────────────────────────────────
  useEffect(() => {
    if (phase === "playing" && questions.length > 0) {
      Animated.timing(progressAnim, {
        toValue: (currentQuestionIndex + 1) / questions.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentQuestionIndex, questions.length, phase]);

  // ── Cleanup on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    setSelectedOption(-1); // indicates timeout
    setShowFeedback(true);

    feedbackTimeoutRef.current = setTimeout(() => {
      advanceQuestion(score);
      processingRef.current = false;
    }, FEEDBACK_DELAY_MS);
  }, [score, currentQuestionIndex, questions.length]);

  const handleSelectOption = useCallback(
    async (optionIndex: number) => {
      if (showFeedback || processingRef.current) return;
      processingRef.current = true;

      // Stop timer
      if (timerRef.current) clearInterval(timerRef.current);

      setSelectedOption(optionIndex);

      const currentQ = questions[currentQuestionIndex];
      if (!currentQ) {
        processingRef.current = false;
        return;
      }

      try {
        const result = await answerMutation.mutateAsync({
          questionId: currentQ.id,
          selectedOption: optionIndex,
        });

        setCorrectOption(result.correctOption);
        setShowFeedback(true);

        const newScore = result.correct ? score + 1 : score;
        if (result.correct) setScore(newScore);

        feedbackTimeoutRef.current = setTimeout(() => {
          advanceQuestion(newScore);
          processingRef.current = false;
        }, FEEDBACK_DELAY_MS);
      } catch {
        // On error, still advance to avoid getting stuck
        setShowFeedback(true);
        feedbackTimeoutRef.current = setTimeout(() => {
          advanceQuestion(score);
          processingRef.current = false;
        }, FEEDBACK_DELAY_MS);
      }
    },
    [showFeedback, currentQuestionIndex, questions, score],
  );

  const advanceQuestion = useCallback(
    (currentScore: number) => {
      const isLast = currentQuestionIndex >= questions.length - 1;

      if (isLast) {
        // Complete the attempt
        const totalTimeMs = Date.now() - startTime;
        completeMutation.mutate({ score: currentScore, totalTimeMs });
        setPhase("results");
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
        setShowFeedback(false);
        setCorrectOption(null);
        if (game?.time_limit_seconds) {
          setTimeLeft(game.time_limit_seconds);
        }
      }
    },
    [currentQuestionIndex, questions.length, startTime, game?.time_limit_seconds],
  );

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getMedalIcon = (rank: number): keyof typeof Ionicons.glyphMap | null => {
    if (rank === 1) return "trophy";
    if (rank === 2) return "medal-outline";
    if (rank === 3) return "ribbon-outline";
    return null;
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return colors.textMuted;
  };

  // ── Loading State ────────────────────────────────────────────
  const isLoading = gameLoading || questionsLoading || attemptLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Game not found"
          subtitle="This trivia game may have been removed"
        />
      </SafeAreaView>
    );
  }

  // ── PRE-GAME SCREEN ──────────────────────────────────────────
  if (phase === "pre") {
    const pointsPerQ = game.points_per_question ?? 10;

    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.preGameContent}>
          {/* Game icon */}
          <View style={styles.preGameIconContainer}>
            <Ionicons name="bulb" size={48} color={colors.primary} />
          </View>

          {/* Title & description */}
          <Text style={styles.preGameTitle}>{game.title}</Text>
          {game.description ? (
            <Text style={styles.preGameDescription}>{game.description}</Text>
          ) : null}

          {/* Rules card */}
          <View style={styles.rulesCard}>
            <Text style={styles.rulesHeading}>Game Rules</Text>

            <View style={styles.ruleRow}>
              <View style={styles.ruleIconCircle}>
                <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.ruleTextContainer}>
                <Text style={styles.ruleLabel}>Questions</Text>
                <Text style={styles.ruleValue}>{questions.length}</Text>
              </View>
            </View>

            {game.time_limit_seconds ? (
              <View style={styles.ruleRow}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name="timer-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.ruleTextContainer}>
                  <Text style={styles.ruleLabel}>Time per question</Text>
                  <Text style={styles.ruleValue}>{game.time_limit_seconds} seconds</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.ruleRow}>
              <View style={styles.ruleIconCircle}>
                <Ionicons name="star-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.ruleTextContainer}>
                <Text style={styles.ruleLabel}>Points per correct answer</Text>
                <Text style={styles.ruleValue}>{pointsPerQ}</Text>
              </View>
            </View>

            <View style={[styles.ruleRow, { borderBottomWidth: 0 }]}>
              <View style={styles.ruleIconCircle}>
                <Ionicons name="trophy-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.ruleTextContainer}>
                <Text style={styles.ruleLabel}>Max points</Text>
                <Text style={styles.ruleValue}>{questions.length * pointsPerQ}</Text>
              </View>
            </View>
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={[styles.startButton, startMutation.isPending && styles.buttonDisabled]}
            onPress={() => startMutation.mutate()}
            disabled={startMutation.isPending || questions.length === 0}
            activeOpacity={0.8}
          >
            {startMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="play" size={20} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.startButtonText}>Start Game</Text>
              </>
            )}
          </TouchableOpacity>

          {startMutation.isError ? (
            <Text style={styles.errorText}>
              Failed to start game. You may have already played this trivia.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── GAME SCREEN (playing) ────────────────────────────────────
  if (phase === "playing") {
    const currentQ = questions[currentQuestionIndex];
    const options: string[] = currentQ?.options ?? [];

    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        <View style={styles.gameContainer}>
          {/* Progress header */}
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
            <Text style={styles.scoreText}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} /> {score}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          {/* Timer */}
          {timeLeft !== null ? (
            <View style={styles.timerContainer}>
              <Ionicons
                name="timer-outline"
                size={20}
                color={timeLeft <= LOW_TIME_THRESHOLD ? colors.error : colors.textSecondary}
              />
              <Text
                style={[
                  styles.timerText,
                  timeLeft <= LOW_TIME_THRESHOLD && styles.timerTextLow,
                ]}
              >
                {timeLeft}s
              </Text>
            </View>
          ) : null}

          {/* Question */}
          <ScrollView
            style={styles.questionScroll}
            contentContainerStyle={styles.questionScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.questionText}>{currentQ?.question_text}</Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = correctOption === index;
                const isWrong = isSelected && showFeedback && correctOption !== index;

                let optionStyle = styles.optionCard;
                let optionTextStyle = styles.optionText;
                let letterStyle = styles.optionLetter;
                let letterContainerStyle = styles.letterContainer;

                if (showFeedback) {
                  if (isCorrect) {
                    optionStyle = { ...styles.optionCard, ...styles.optionCorrect };
                    optionTextStyle = { ...styles.optionText, color: colors.white };
                    letterStyle = { ...styles.optionLetter, color: colors.success };
                    letterContainerStyle = {
                      ...styles.letterContainer,
                      backgroundColor: colors.white,
                    };
                  } else if (isWrong) {
                    optionStyle = { ...styles.optionCard, ...styles.optionWrong };
                    optionTextStyle = { ...styles.optionText, color: colors.white };
                    letterStyle = { ...styles.optionLetter, color: colors.error };
                    letterContainerStyle = {
                      ...styles.letterContainer,
                      backgroundColor: colors.white,
                    };
                  }
                } else if (isSelected) {
                  optionStyle = { ...styles.optionCard, ...styles.optionSelected };
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={optionStyle}
                    onPress={() => handleSelectOption(index)}
                    disabled={showFeedback || processingRef.current}
                    activeOpacity={0.7}
                  >
                    <View style={letterContainerStyle}>
                      <Text style={letterStyle}>{OPTION_LETTERS[index] ?? index + 1}</Text>
                    </View>
                    <Text style={optionTextStyle} numberOfLines={3}>
                      {option}
                    </Text>
                    {showFeedback && isCorrect ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.white}
                        style={styles.feedbackIcon}
                      />
                    ) : null}
                    {showFeedback && isWrong ? (
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={colors.white}
                        style={styles.feedbackIcon}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Timeout feedback */}
            {showFeedback && selectedOption === -1 ? (
              <View style={styles.timeoutBanner}>
                <Ionicons name="time-outline" size={18} color={colors.error} />
                <Text style={styles.timeoutText}>Time's up!</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ── RESULTS SCREEN ───────────────────────────────────────────
  const pointsPerQ = game.points_per_question ?? 10;
  const totalPoints = score * pointsPerQ;
  const totalTimeMs = existingAttempt?.total_time_ms ?? 0;

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.resultsContent}>
        {/* Trophy icon */}
        <View style={styles.resultsIconContainer}>
          <Ionicons name="trophy" size={56} color="#FFD700" />
        </View>

        {/* Score summary */}
        <Text style={styles.resultsTitle}>Game Complete!</Text>
        <Text style={styles.resultsScore}>
          You scored {score} out of {questions.length}!
        </Text>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Points Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color={colors.brandPink} />
            <Text style={styles.statValue}>{formatTime(totalTimeMs)}</Text>
            <Text style={styles.statLabel}>Time Taken</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={24} color={colors.success} />
            <Text style={styles.statValue}>
              {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        {/* Leaderboard toggle */}
        <TouchableOpacity
          style={styles.leaderboardToggle}
          onPress={() => setShowLeaderboard((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.leaderboardToggleLeft}>
            <Ionicons name="podium-outline" size={20} color={colors.primary} />
            <Text style={styles.leaderboardToggleText}>View Leaderboard</Text>
          </View>
          <Ionicons
            name={showLeaderboard ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Leaderboard list */}
        {showLeaderboard ? (
          <View style={styles.leaderboardContainer}>
            {leaderboard.length === 0 ? (
              <Text style={styles.leaderboardEmptyText}>No entries yet</Text>
            ) : (
              leaderboard.map((entry: LeaderboardEntry, index: number) => {
                const rank = index + 1;
                const medalIcon = getMedalIcon(rank);
                const isCurrentUser = entry.user_id === user?.id;
                const profile = entry.profiles;

                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.leaderboardRow,
                      isCurrentUser && styles.leaderboardRowCurrent,
                      index === leaderboard.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    {/* Rank */}
                    <View style={styles.rankContainer}>
                      {medalIcon ? (
                        <Ionicons name={medalIcon} size={20} color={getMedalColor(rank)} />
                      ) : (
                        <Text style={styles.rankText}>{rank}</Text>
                      )}
                    </View>

                    {/* Avatar + Name */}
                    <Avatar
                      name={profile?.full_name ?? null}
                      size={36}
                      photoUrl={profile?.avatar_url}
                    />
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName} numberOfLines={1}>
                        {profile?.full_name ?? "Anonymous"}
                        {isCurrentUser ? " (You)" : ""}
                      </Text>
                      <Text style={styles.leaderboardMeta}>
                        {entry.total_time_ms ? formatTime(entry.total_time_ms) : "--"}
                      </Text>
                    </View>

                    {/* Score */}
                    <Text style={styles.leaderboardScore}>
                      {entry.score ?? 0}/{questions.length}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Pre-Game ────────────────────────────────────────────────
  preGameContent: {
    padding: spacing.xl,
    paddingBottom: 40,
    alignItems: "center",
  },
  preGameIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  preGameTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  preGameDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  rulesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xxl,
    ...shadows.md,
  },
  rulesHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  ruleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  ruleTextContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ruleLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  ruleValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    ...typography.button,
    color: colors.white,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: "center",
  },

  // ── Game ────────────────────────────────────────────────────
  gameContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  scoreText: {
    ...typography.captionBold,
    color: colors.success,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    gap: 6,
  },
  timerText: {
    ...typography.h2,
    color: colors.textSecondary,
  },
  timerTextLow: {
    color: colors.error,
  },
  questionScroll: {
    flex: 1,
  },
  questionScrollContent: {
    paddingBottom: 40,
  },
  questionText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  letterContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  optionLetter: {
    ...typography.captionBold,
    color: colors.primary,
  },
  optionText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  feedbackIcon: {
    marginLeft: spacing.sm,
  },
  timeoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
  },
  timeoutText: {
    ...typography.bodyMedium,
    color: colors.error,
  },

  // ── Results ─────────────────────────────────────────────────
  resultsContent: {
    padding: spacing.xl,
    paddingBottom: 40,
    alignItems: "center",
  },
  resultsIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  resultsTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  resultsScore: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xxl,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xxl,
    width: "100%",
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  leaderboardToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  leaderboardToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  leaderboardToggleText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  leaderboardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    ...shadows.sm,
  },
  leaderboardEmptyText: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.xl,
    textAlign: "center",
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  leaderboardRowCurrent: {
    backgroundColor: colors.primaryMuted,
  },
  rankContainer: {
    width: 28,
    alignItems: "center",
  },
  rankText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  leaderboardMeta: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  leaderboardScore: {
    ...typography.captionBold,
    color: colors.primary,
  },
});
