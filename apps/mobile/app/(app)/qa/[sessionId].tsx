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
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
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
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function QADetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["session-questions", sessionId, user?.id],
    queryFn: () => getSessionQuestions(supabase, sessionId!, user?.id),
    enabled: !!sessionId,
  });

  React.useEffect(() => {
    navigation.setOptions({
      title: "Q&A",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const renderQuestion = ({ item }: { item: any }) => (
    <View style={styles.questionCard}>
      <View style={styles.questionContent}>
        <Text style={styles.questionText}>{item.question_text}</Text>
        {item.answer_text && (
          <View style={styles.answerBlock}>
            <View style={styles.answerHeader}>
              <Ionicons name="chatbox" size={14} color={colors.success} />
              <Text style={styles.answerLabel}>Answer</Text>
            </View>
            <Text style={styles.answerText}>{item.answer_text}</Text>
          </View>
        )}
        <View style={styles.questionMeta}>
          <Text style={styles.metaText}>
            {item.is_anonymous ? "Anonymous" : "Attendee"}
          </Text>
          <Text style={styles.metaDot}>&middot;</Text>
          <Text style={styles.metaText}>
            {new Date(item.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
          {item.status === "answered" && (
            <>
              <Text style={styles.metaDot}>&middot;</Text>
              <View style={styles.answeredBadge}>
                <Text style={styles.answeredText}>Answered</Text>
              </View>
            </>
          )}
        </View>
      </View>
      {user && (
        <TouchableOpacity
          style={styles.upvoteBtn}
          onPress={() => upvoteMutation.mutate(item.id)}
        >
          <Ionicons
            name={item.is_upvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
            size={24}
            color={item.is_upvoted ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.upvoteCount,
              item.is_upvoted && { color: colors.primary },
            ]}
          >
            {item.upvote_count}
          </Text>
        </TouchableOpacity>
      )}
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
          data={questions ?? []}
          keyExtractor={(item: any) => item.id}
          renderItem={renderQuestion}
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
              icon="help-circle-outline"
              title="No questions yet"
              subtitle="Be the first to ask a question about this session"
            />
          }
        />

        {/* Ask question input */}
        {user && currentEvent && (
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.anonToggle}
              onPress={() => setIsAnonymous(!isAnonymous)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isAnonymous ? "eye-off" : "eye"}
                size={20}
                color={isAnonymous ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor={colors.textMuted}
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!newQuestion.trim() || askMutation.isPending) && styles.sendBtnDisabled,
              ]}
              onPress={() => askMutation.mutate()}
              disabled={!newQuestion.trim() || askMutation.isPending}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  newQuestion.trim() && !askMutation.isPending
                    ? colors.white
                    : colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  questionCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  answerBlock: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  answerLabel: {
    ...typography.captionBold,
    color: colors.success,
  },
  answerText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  metaText: {
    ...typography.small,
    color: colors.textMuted,
  },
  metaDot: {
    ...typography.small,
    color: colors.textMuted,
  },
  answeredBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  answeredText: {
    ...typography.small,
    color: colors.success,
  },
  upvoteBtn: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
    gap: 2,
  },
  upvoteCount: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  anonToggle: {
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 100,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
});
