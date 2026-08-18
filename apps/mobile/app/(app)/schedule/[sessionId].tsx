import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getSessionsByEvent,
  getUserBookmarks,
  toggleSessionBookmark,
  getSessionRsvpStatus,
  rsvpToSession,
  cancelRsvp,
  getSessionQuestions,
  getSessionNote,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { Badge } from "../../../src/components/badge";
import { TabBar } from "../../../src/components/tab-bar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // Fetch all sessions and find this one (reuses cached schedule data)
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["schedule-sessions", currentEvent?.id],
    queryFn: () => getSessionsByEvent(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const session = (sessions ?? []).find((s: any) => s.id === sessionId) as any;

  React.useEffect(() => {
    const title = (session as any)?.title;
    navigation.setOptions({
      title: title ?? "Session",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [session, navigation]);

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => getUserBookmarks(supabase, user!.id),
    enabled: !!user?.id,
  });

  const { data: rsvpData } = useQuery({
    queryKey: ["rsvp-status", sessionId, user?.id],
    queryFn: () => getSessionRsvpStatus(supabase, sessionId!, user?.id),
    enabled: !!sessionId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["session-questions", sessionId, user?.id],
    queryFn: () => getSessionQuestions(supabase, sessionId!, user?.id),
    enabled: !!sessionId && activeTab === "qa",
  });

  const { data: note } = useQuery({
    queryKey: ["session-note", sessionId, user?.id],
    queryFn: () => getSessionNote(supabase, sessionId!, user!.id),
    enabled: !!sessionId && !!user?.id && activeTab === "notes",
  });

  const isBookmarked = bookmarks.includes(sessionId!);

  const bookmarkMutation = useMutation({
    mutationFn: () => toggleSessionBookmark(supabase, sessionId!, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const rsvpMutation = useMutation({
    mutationFn: () => rsvpToSession(supabase, sessionId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rsvp-status", sessionId] }),
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: () => cancelRsvp(supabase, sessionId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rsvp-status", sessionId] }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["schedule-sessions"] });
    await queryClient.invalidateQueries({ queryKey: ["rsvp-status", sessionId] });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="alert-circle-outline" title="Session not found" />
      </SafeAreaView>
    );
  }

  const tracks = (session.session_tracks ?? []).map((st: any) => st.tracks).filter(Boolean);
  const speakers = (session.session_speakers ?? []).map((ss: any) => ss.speakers).filter(Boolean);
  const start = formatDateTime(session.start_time);
  const end = formatDateTime(session.end_time);

  const tabs = [
    { key: "info", label: "Info" },
    { key: "qa", label: `Q&A (${questions.length})` },
    { key: "notes", label: "Notes" },
  ];

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{session.title}</Text>

          {/* Track badges */}
          {tracks.length > 0 && (
            <View style={styles.badgeRow}>
              {tracks.map((t: any) => (
                <Badge key={t.id} label={t.name} color={t.color || colors.primary} backgroundColor={`${t.color || colors.primary}20`} />
              ))}
              {session.type && session.type !== "session" && (
                <Badge label={session.type} />
              )}
            </View>
          )}

          {/* Date/Time */}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{start.date}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{start.time} - {end.time}</Text>
          </View>
          {session.location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{session.location}</Text>
            </View>
          )}

          {/* Action buttons */}
          {user && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, isBookmarked && styles.actionBtnActive]}
                onPress={() => bookmarkMutation.mutate()}
              >
                <Ionicons
                  name={isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={16}
                  color={isBookmarked ? colors.white : colors.primary}
                />
                <Text style={[styles.actionBtnText, isBookmarked && styles.actionBtnTextActive]}>
                  {isBookmarked ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>

              {rsvpData && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    rsvpData.status === "confirmed" && styles.actionBtnActive,
                  ]}
                  onPress={() => {
                    if (rsvpData.status === "confirmed") {
                      cancelRsvpMutation.mutate();
                    } else {
                      rsvpMutation.mutate();
                    }
                  }}
                >
                  <Ionicons
                    name={rsvpData.status === "confirmed" ? "checkmark-circle" : "hand-right-outline"}
                    size={16}
                    color={rsvpData.status === "confirmed" ? colors.white : colors.primary}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      rsvpData.status === "confirmed" && styles.actionBtnTextActive,
                    ]}
                  >
                    {rsvpData.status === "confirmed" ? "RSVP'd" : "RSVP"}
                  </Text>
                  {rsvpData.capacity && (
                    <Text style={[styles.capacityText, rsvpData.status === "confirmed" && { color: "rgba(255,255,255,0.8)" }]}>
                      {rsvpData.confirmedCount}/{rsvpData.capacity}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Tabs */}
        <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === "info" && (
            <>
              {/* Description */}
              {session.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.description}>{session.description}</Text>
                </View>
              )}

              {/* Speakers */}
              {speakers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Speakers</Text>
                  {speakers.map((sp: any) => (
                    <TouchableOpacity
                      key={sp.id}
                      style={styles.speakerCard}
                      onPress={() => router.push(`/(app)/speakers/${sp.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Avatar name={sp.name} size={48} />
                      <View style={styles.speakerInfo}>
                        <Text style={styles.speakerName}>{sp.name}</Text>
                        {sp.title && <Text style={styles.speakerRole}>{sp.title}</Text>}
                        {sp.company && <Text style={styles.speakerCompany}>{sp.company}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === "qa" && (
            <View style={styles.section}>
              {questions.length === 0 ? (
                <EmptyState icon="chatbubble-ellipses-outline" title="No questions yet" subtitle="Be the first to ask!" />
              ) : (
                questions.map((q: any) => (
                  <View key={q.id} style={styles.questionCard}>
                    <Text style={styles.questionText}>{q.question_text}</Text>
                    <View style={styles.questionMeta}>
                      <View style={styles.upvoteRow}>
                        <Ionicons
                          name={q.is_upvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                          size={18}
                          color={q.is_upvoted ? colors.primary : colors.textMuted}
                        />
                        <Text style={styles.upvoteCount}>{q.upvote_count}</Text>
                      </View>
                      {q.status === "answered" && (
                        <Badge label="Answered" color={colors.success} backgroundColor={colors.successSoft} />
                      )}
                    </View>
                    {q.answer_text && (
                      <View style={styles.answerBox}>
                        <Text style={styles.answerLabel}>Answer</Text>
                        <Text style={styles.answerText}>{q.answer_text}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "notes" && (
            <View style={styles.section}>
              {!user ? (
                <EmptyState icon="lock-closed-outline" title="Sign in to take notes" />
              ) : note ? (
                <View style={styles.noteCard}>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteDate}>
                    Last updated {new Date(note.updated_at).toLocaleDateString()}
                  </Text>
                </View>
              ) : (
                <EmptyState icon="document-text-outline" title="No notes yet" subtitle="Notes editing coming soon" />
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionBtnActive: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  actionBtnTextActive: {
    color: colors.white,
  },
  capacityText: {
    ...typography.small,
    color: colors.textMuted,
    marginLeft: 2,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  speakerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  speakerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  speakerName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  speakerRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  speakerCompany: {
    ...typography.small,
    color: colors.textMuted,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  questionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  upvoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  upvoteCount: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  answerBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
  },
  answerLabel: {
    ...typography.captionBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  answerText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  noteContent: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  noteDate: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
