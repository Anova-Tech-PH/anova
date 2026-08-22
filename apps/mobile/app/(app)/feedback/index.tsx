import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { getFeedbackForms, submitSessionFeedback } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function FeedbackScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFormIndex, setSelectedFormIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: forms, isLoading } = useQuery({
    queryKey: ["feedback-forms", currentEvent?.id],
    queryFn: () => getFeedbackForms(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const selectedForm = forms?.[selectedFormIndex] ?? forms?.[0];

  const submitMutation = useMutation({
    mutationFn: () =>
      submitSessionFeedback(supabase, {
        sessionId: currentEvent!.id,
        userId: user!.id,
        feedbackFormId: selectedForm!.id,
        answers,
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["feedback-forms"] });
    setRefreshing(false);
  };

  const updateAnswer = (key: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const renderRatingStars = (questionKey: string, currentRating: number) => {
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => updateAnswer(questionKey, star)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons
              name={star <= currentRating ? "star" : "star-outline"}
              size={32}
              color={star <= currentRating ? colors.warning : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (!currentEvent) {
      return (
        <View style={shared.centered}>
          <EmptyState
            icon="calendar-outline"
            title="Select an event"
            subtitle="Go to My Events to choose an event"
          />
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={shared.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!forms || forms.length === 0) {
      return (
        <View style={shared.centered}>
          <EmptyState
            icon="chatbox-ellipses-outline"
            title="No feedback forms"
            subtitle="Feedback forms for this event have not been set up yet"
          />
        </View>
      );
    }

    if (submitted) {
      return (
        <View style={shared.centered}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successSubtitle}>
            Your feedback has been submitted successfully.
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSubmitted(false);
              setAnswers({});
            }}
          >
            <Text style={styles.resetBtnText}>Submit Another Response</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Form selector if multiple */}
        {forms.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formTabs}
          >
            {forms.map((form: any, idx: number) => (
              <TouchableOpacity
                key={form.id}
                style={[styles.formTab, idx === selectedFormIndex && styles.formTabActive]}
                onPress={() => {
                  setSelectedFormIndex(idx);
                  setAnswers({});
                }}
              >
                <Text
                  style={[
                    styles.formTabText,
                    idx === selectedFormIndex && styles.formTabTextActive,
                  ]}
                >
                  {form.title ?? `Form ${idx + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Form title */}
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>{selectedForm.title ?? "Event Feedback"}</Text>
          {selectedForm.description && (
            <Text style={styles.formDescription}>{selectedForm.description}</Text>
          )}
        </View>

        {/* Questions */}
        {(selectedForm.questions ?? []).map((q: any, idx: number) => (
          <View key={q.id ?? idx} style={styles.questionCard}>
            <Text style={styles.questionLabel}>
              {idx + 1}. {q.question_text ?? q.label ?? q.title}
            </Text>

            {(q.type === "rating" || q.type === "stars") ? (
              renderRatingStars(
                q.id ?? `q-${idx}`,
                (answers[q.id ?? `q-${idx}`] as number) || 0
              )
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="Type your answer..."
                placeholderTextColor={colors.textMuted}
                value={(answers[q.id ?? `q-${idx}`] as string) ?? ""}
                onChangeText={(text) => updateAnswer(q.id ?? `q-${idx}`, text)}
                multiline={q.type === "textarea" || q.type === "long_text"}
                numberOfLines={q.type === "textarea" || q.type === "long_text" ? 4 : 1}
                textAlignVertical={
                  q.type === "textarea" || q.type === "long_text" ? "top" : "center"
                }
              />
            )}
          </View>
        ))}

        {/* Submit button */}
        {user && (
          <TouchableOpacity
            style={[shared.buttonPrimary, styles.submitBtn]}
            onPress={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={shared.buttonPrimaryText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        )}

        {submitMutation.isError && (
          <Text style={styles.errorText}>
            Failed to submit feedback. Please try again.
          </Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
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
        <Text style={styles.pageTitle}>Feedback</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
  },
  formTabs: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  formTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formTabText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  formTabTextActive: {
    color: colors.white,
  },
  formHeader: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  formDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  questionLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  starRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 44,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  resetBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  resetBtnText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
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
});
