import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getSessionQuestions,
  askQuestion,
  toggleUpvote,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { colors, typography, spacing, radius, shared } from "../../../src/theme";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function QADetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session-info", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, title, start_time, end_time")
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["session-questions", sessionId, user?.id],
    queryFn: () => getSessionQuestions(supabase, sessionId!, user?.id),
    enabled: !!sessionId,
  });

  const askMutation = useMutation({
    mutationFn: () =>
      askQuestion(supabase, {
        sessionId: sessionId!,
        eventId: currentEvent!.id,
        userId: user!.id,
        content: newQuestion,
        isAnonymous,
      }),
    onSuccess: () => {
      setNewQuestion("");
      queryClient.invalidateQueries({ queryKey: ["session-questions"] });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: (questionId: string) =>
      toggleUpvote(supabase, questionId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-questions"] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["session-questions"] });
    await queryClient.invalidateQueries({ queryKey: ["session-info"] });
    setRefreshing(false);
  };

  const header = (
    <View style={styles.customHeader}>
      <TouchableOpacity
        onPress={() => router.replace("/(app)/qa" as any)}
        style={styles.headerBackBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {session?.title ?? "Session Q&A"}
      </Text>
    </View>
  );

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

  const sessionDate = session
    ? new Date(session.start_time).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const items = questions ?? [];

  const renderQuestion = ({ item }: { item: any }) => (
    <View style={styles.questionCard}>
      {/* Upvote button — left side like web */}
      {user && (
        <TouchableOpacity
          style={[
            styles.upvoteBtn,
            item.is_upvoted && styles.upvoteBtnActive,
          ]}
          onPress={() => upvoteMutation.mutate(item.id)}
        >
          <Ionicons
            name="chevron-up"
            size={16}
            color={item.is_upvoted ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.upvoteCount,
              item.is_upvoted && { color: colors.primary, fontWeight: "600" },
            ]}
          >
            {item.upvote_count}
          </Text>
        </TouchableOpacity>
      )}

      {/* Question content */}
      <View style={styles.questionContent}>
        <Text style={styles.questionText}>{item.question_text}</Text>
        <View style={styles.questionMeta}>
          <Text style={styles.metaText}>
            {item.is_anonymous ? "Anonymous" : timeAgo(item.created_at)}
          </Text>
          {item.status === "answered" && (
            <View style={styles.answeredBadge}>
              <Text style={styles.answeredText}>Answered</Text>
            </View>
          )}
        </View>
        {item.answer_text && (
          <View style={styles.answerBlock}>
            <Text style={styles.answerLabel}>Answer</Text>
            <Text style={styles.answerText}>{item.answer_text}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          renderItem={renderQuestion}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <TouchableOpacity
                onPress={() => router.replace("/(app)/qa" as any)}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.backText}>Back to Sessions</Text>
              </TouchableOpacity>

              <Text style={styles.sessionDate}>{sessionDate}</Text>
              <Text style={styles.sessionTitle}>
                {session?.title ?? "Session Q&A"}
              </Text>
              <Text style={styles.questionCountText}>
                {items.length} {items.length === 1 ? "question" : "questions"}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No questions yet. Be the first to ask!
            </Text>
          }
        />

        {/* Ask question form — card style like web */}
        {user && currentEvent && (
          <View style={styles.askCard}>
            <Text style={styles.askTitle}>Ask a Question</Text>
            <View style={styles.textareaWrapper}>
              <TextInput
                style={styles.textarea}
                placeholder="Type your question..."
                placeholderTextColor={colors.textMuted}
                value={newQuestion}
                onChangeText={setNewQuestion}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.askFooter}>
              <View style={styles.askFooterLeft}>
                <Text style={styles.charCount}>
                  {newQuestion.length}/1000
                </Text>
                <TouchableOpacity
                  style={styles.anonToggle}
                  onPress={() => setIsAnonymous(!isAnonymous)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isAnonymous ? "eye-off" : "eye"}
                    size={16}
                    color={isAnonymous ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.anonLabel,
                      isAnonymous && { color: colors.primary },
                    ]}
                  >
                    {isAnonymous ? "Anonymous" : "Visible"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.askBtn,
                  (!newQuestion.trim() || askMutation.isPending) &&
                    styles.askBtnDisabled,
                ]}
                onPress={() => askMutation.mutate()}
                disabled={!newQuestion.trim() || askMutation.isPending}
              >
                <Text
                  style={[
                    styles.askBtnText,
                    (!newQuestion.trim() || askMutation.isPending) &&
                      styles.askBtnTextDisabled,
                  ]}
                >
                  {askMutation.isPending ? "Submitting..." : "Ask Question"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Custom header bar
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerBackBtn: {
    padding: 4,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },

  // Header
  headerSection: {
    marginBottom: spacing.lg,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sessionDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  questionCountText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Empty
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: spacing.xxxl,
  },

  // Question card
  questionCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  questionContent: {
    flex: 1,
    minWidth: 0,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  answeredBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  answeredText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.success,
  },
  answerBlock: {
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  answerText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // Upvote
  upvoteBtn: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    gap: 2,
  },
  upvoteBtnActive: {
    backgroundColor: colors.primaryMuted,
  },
  upvoteCount: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Ask question card
  askCard: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.borderLight,
    borderRightColor: colors.borderLight,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  askTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textareaWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  textarea: {
    fontSize: 14,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 72,
    maxHeight: 120,
  },
  askFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  askFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  anonToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  anonLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  askBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  askBtnDisabled: {
    opacity: 0.5,
  },
  askBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  askBtnTextDisabled: {
    color: colors.white,
  },
});
