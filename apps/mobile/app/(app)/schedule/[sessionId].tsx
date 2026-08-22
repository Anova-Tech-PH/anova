import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
  saveSessionNote,
  deleteSessionNote,
  getSessionPolls,
  getSessionPollVoteCounts,
  getUserPollVotes,
  votePoll,
  submitPollTextResponse,
  submitPollRating,
  getSessionChat,
  sendChatMessage,
  getSessionLikeStatus,
  toggleSessionLike,
  getDefaultFeedbackForm,
  submitSessionFeedback,
  getTopics,
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ── Poll Option Row ──────────────────────────────────────────
function PollOptionRow({
  option,
  totalVotes,
  voteCount,
  selected,
  showResults,
  disabled,
  onPress,
}: {
  option: { id: string; text: string };
  totalVotes: number;
  voteCount: number;
  selected: boolean;
  showResults: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

  return (
    <TouchableOpacity
      style={[pollStyles.optionRow, selected && pollStyles.optionSelected]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {showResults && (
        <View style={[pollStyles.progressBar, { width: `${pct}%` } as any]} />
      )}
      <View style={pollStyles.optionContent}>
        <View style={pollStyles.optionLeft}>
          {!showResults ? (
            <View style={[pollStyles.radio, selected && pollStyles.radioSelected]}>
              {selected && <View style={pollStyles.radioDot} />}
            </View>
          ) : null}
          <Text style={[pollStyles.optionText, selected && { color: colors.primary }]}>
            {option.text}
          </Text>
        </View>
        {showResults && (
          <Text style={pollStyles.pctText}>{pct}% ({voteCount})</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Star Rating ──────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  size = 28,
  disabled = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange?.(star)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={star <= value ? colors.warning : colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Chat Message Bubble ──────────────────────────────────────
function ChatBubble({
  message,
  isOwnMessage,
}: {
  message: {
    id: string;
    content: string;
    created_at: string;
    profile: { full_name: string; avatar_url: string | null };
  };
  isOwnMessage: boolean;
}) {
  return (
    <View style={[chatStyles.bubbleRow, isOwnMessage && chatStyles.bubbleRowOwn]}>
      {!isOwnMessage && (
        <Avatar name={message.profile.full_name} size={32} uri={message.profile.avatar_url} />
      )}
      <View style={[chatStyles.bubble, isOwnMessage && chatStyles.bubbleOwn]}>
        {!isOwnMessage && (
          <Text style={chatStyles.bubbleName}>{message.profile.full_name}</Text>
        )}
        <Text style={[chatStyles.bubbleText, isOwnMessage && { color: colors.white }]}>
          {message.content}
        </Text>
        <Text style={[chatStyles.bubbleTime, isOwnMessage && { color: "rgba(255,255,255,0.7)" }]}>
          {timeAgo(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("polls");

  // ── Notes state ──
  const [noteText, setNoteText] = useState("");
  const [noteLoaded, setNoteLoaded] = useState(false);

  // ── Chat state ──
  const [chatInput, setChatInput] = useState("");
  const chatListRef = useRef<FlatList>(null);

  // ── Poll text input state (for word_cloud / short_answer) ──
  const [pollTextInputs, setPollTextInputs] = useState<Record<string, string>>({});

  // ── Feedback state ──
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<string, string | number>>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // ── Session data ──
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["schedule-sessions", currentEvent?.id],
    queryFn: () => getSessionsByEvent(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const session = (sessions ?? []).find((s: any) => s.id === sessionId) as any;

  useEffect(() => {
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

  // ── Bookmarks ──
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => getUserBookmarks(supabase, user!.id),
    enabled: !!user?.id,
  });

  // ── RSVP ──
  const { data: rsvpData } = useQuery({
    queryKey: ["rsvp-status", sessionId, user?.id],
    queryFn: () => getSessionRsvpStatus(supabase, sessionId!, user?.id),
    enabled: !!sessionId,
  });

  // ── Q&A ──
  const { data: questions = [] } = useQuery({
    queryKey: ["session-questions", sessionId, user?.id],
    queryFn: () => getSessionQuestions(supabase, sessionId!, user?.id),
    enabled: !!sessionId && activeTab === "qa",
  });

  // ── Notes ──
  const { data: note, isFetched: noteFetched } = useQuery({
    queryKey: ["session-note", sessionId, user?.id],
    queryFn: () => getSessionNote(supabase, sessionId!, user!.id),
    enabled: !!sessionId && !!user?.id,
  });

  useEffect(() => {
    if (!noteFetched || noteLoaded) return;
    setNoteText(note?.content ?? "");
    setNoteLoaded(true);
  }, [note, noteFetched, noteLoaded]);

  // ── Polls ──
  const { data: polls = [] } = useQuery({
    queryKey: ["session-polls", sessionId],
    queryFn: () => getSessionPolls(supabase, sessionId!),
    enabled: !!sessionId && activeTab === "polls",
  });

  const pollIds = polls.map((p: any) => p.id);
  const { data: pollVoteCounts = {} } = useQuery({
    queryKey: ["poll-vote-counts", pollIds.join(",")],
    queryFn: () => getSessionPollVoteCounts(supabase, pollIds),
    enabled: pollIds.length > 0 && activeTab === "polls",
  });

  const { data: userPollVotes = {} } = useQuery({
    queryKey: ["user-poll-votes", sessionId, user?.id],
    queryFn: () => getUserPollVotes(supabase, sessionId!, user!.id),
    enabled: !!sessionId && !!user?.id && activeTab === "polls",
  });

  // ── Chat ──
  const { data: chatMessages = [] } = useQuery({
    queryKey: ["session-chat", sessionId],
    queryFn: () => getSessionChat(supabase, sessionId!),
    enabled: !!sessionId && activeTab === "chat",
    refetchInterval: activeTab === "chat" ? 10000 : false,
  });

  // ── Likes ──
  const { data: likeData } = useQuery({
    queryKey: ["session-like", sessionId, user?.id],
    queryFn: () => getSessionLikeStatus(supabase, sessionId!, user!.id),
    enabled: !!sessionId && !!user?.id,
  });

  // ── Feedback ──
  const sessionEnded = session ? new Date(session.end_time) < new Date() : false;

  const { data: feedbackForm } = useQuery({
    queryKey: ["feedback-form", currentEvent?.id],
    queryFn: () => getDefaultFeedbackForm(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id && activeTab === "feedback" && sessionEnded,
  });

  // Check if user already submitted feedback
  const { data: existingFeedback } = useQuery({
    queryKey: ["existing-feedback", sessionId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_feedback")
        .select("id")
        .eq("session_id", sessionId!)
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!sessionId && !!user?.id && activeTab === "feedback",
  });

  // ── Community Topics ──
  const { data: communityTopics = [] } = useQuery({
    queryKey: ["community-topics", currentEvent?.id, user?.id],
    queryFn: () => getTopics(supabase, currentEvent!.id, user!.id),
    enabled: !!currentEvent?.id && !!user?.id && activeTab === "community",
  });

  const isBookmarked = bookmarks.includes(sessionId!);
  const isLiked = likeData?.liked ?? false;
  const likeCount = likeData?.count ?? 0;

  // ── Mutations ──
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

  const likeMutation = useMutation({
    mutationFn: () => toggleSessionLike(supabase, sessionId!, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session-like", sessionId] }),
  });

  const saveNoteMutation = useMutation({
    mutationFn: (content: string) => saveSessionNote(supabase, sessionId!, user!.id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session-note", sessionId] }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: () => deleteSessionNote(supabase, sessionId!, user!.id),
    onSuccess: () => {
      setNoteText("");
      setNoteLoaded(false);
      queryClient.invalidateQueries({ queryKey: ["session-note", sessionId] });
    },
  });

  const pollVoteMutation = useMutation({
    mutationFn: (params: { pollId: string; optionId: string }) =>
      votePoll(supabase, { pollId: params.pollId, optionId: params.optionId, userId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-poll-votes", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["poll-vote-counts"] });
    },
  });

  const pollTextMutation = useMutation({
    mutationFn: (params: { pollId: string; responseText: string }) =>
      submitPollTextResponse(supabase, { pollId: params.pollId, userId: user!.id, responseText: params.responseText }),
    onSuccess: (_data, variables) => {
      setPollTextInputs((prev) => ({ ...prev, [variables.pollId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["user-poll-votes", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["poll-vote-counts"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      sendChatMessage(supabase, { sessionId: sessionId!, userId: user!.id, content }),
    onSuccess: () => {
      setChatInput("");
      queryClient.invalidateQueries({ queryKey: ["session-chat", sessionId] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      submitSessionFeedback(supabase, {
        sessionId: sessionId!,
        userId: user!.id,
        feedbackFormId: feedbackForm!.id,
        answers: feedbackAnswers,
      }),
    onSuccess: () => {
      setFeedbackSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["existing-feedback", sessionId] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["schedule-sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["rsvp-status", sessionId] }),
      queryClient.invalidateQueries({ queryKey: ["session-like", sessionId] }),
    ]);
    setRefreshing(false);
  };

  const handleDeleteNote = () => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteNoteMutation.mutate() },
    ]);
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
    { key: "polls", label: "Polls" },
    { key: "chat", label: "Chat" },
    { key: "community", label: "Community" },
  ];

  // ── Chat tab needs special layout (no ScrollView, uses FlatList + compose bar) ──
  if (activeTab === "chat") {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {/* Header */}
          <ScrollView
            style={{ flexGrow: 0 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          >
            <View style={styles.header}>
              <Text style={styles.title}>{session.title}</Text>
              {renderActionButtons()}
            </View>
            <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />
          </ScrollView>

          {/* Chat messages */}
          <FlatList
            ref={chatListRef}
            data={chatMessages}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: { item: any }) => (
              <ChatBubble message={item} isOwnMessage={item.user_id === user?.id} />
            )}
            contentContainerStyle={[chatStyles.list, chatMessages.length > 0 && { flexGrow: 1, justifyContent: "flex-end" as const }]}
            ListEmptyComponent={
              <EmptyState icon="chatbubbles-outline" title="No messages yet" subtitle="Start the conversation!" />
            }
            onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* Compose bar */}
          {user && (
            <View style={chatStyles.composeBar}>
              <TextInput
                style={chatStyles.composeInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[chatStyles.sendBtn, !chatInput.trim() && { opacity: 0.4 }]}
                onPress={() => {
                  if (chatInput.trim()) sendMessageMutation.mutate(chatInput.trim());
                }}
                disabled={!chatInput.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="send" size={18} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Render action buttons (shared between normal and chat layouts) ──
  function renderActionButtons() {
    if (!user) return null;
    return (
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
            {isBookmarked ? "In My Agenda" : "Add to My Agenda"}
          </Text>
        </TouchableOpacity>

        {session.rsvp_enabled && rsvpData && (
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
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Back link */}
        <View style={styles.backRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/(app)/schedule" as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
            <Text style={styles.backText}>Show Agenda</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          {/* Like count top-right */}
          {user && (
            <TouchableOpacity
              style={styles.likeTopRight}
              onPress={() => likeMutation.mutate()}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={16}
                color={isLiked ? colors.error : colors.textMuted}
              />
              <Text style={[styles.likeTopText, isLiked && { color: colors.error }]}>
                {likeCount} Likes
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.title}>{session.title}</Text>

          {/* Meta - inline row matching web */}
          <View style={styles.metaWrap}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{start.date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{start.time} - {end.time}</Text>
            </View>
            {session.location && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text style={styles.metaText}>{session.location}</Text>
                <TouchableOpacity
                  onPress={() => router.navigate("/(app)/floormap" as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewMapLink}>View Map</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>0 Attending</Text>
            </View>
          </View>

          {/* Type & Track badges */}
          <View style={styles.badgeRow}>
            {session.type && (
              <Badge label={session.type} />
            )}
            {tracks.map((t: any) => (
              <Badge key={t.id} label={t.name} color={t.color || colors.primary} backgroundColor={`${t.color || colors.primary}20`} />
            ))}
          </View>

          {/* Action buttons */}
          {renderActionButtons()}
        </View>

        {/* Personal Notes (inline, matching web) */}
        {user && (
          <View style={styles.notesSection}>
            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.notesHeaderText}>Personal notes</Text>
              </View>
              <TextInput
                style={noteStyles.input}
                placeholder="Take notes on the session, such as key takeaways, insights, memorable quotes, and more"
                placeholderTextColor={colors.textMuted}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                textAlignVertical="top"
              />
              <View style={noteStyles.actions}>
                {note && (
                  <TouchableOpacity style={noteStyles.cancelBtn} onPress={() => setNoteText(note.content ?? "")}>
                    <Text style={noteStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[noteStyles.saveBtn, !noteText.trim() && { opacity: 0.4 }]}
                  onPress={() => noteText.trim() && saveNoteMutation.mutate(noteText.trim())}
                  disabled={!noteText.trim() || saveNoteMutation.isPending}
                >
                  {saveNoteMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={noteStyles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Description (inline, matching web) */}
        {session.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{session.description}</Text>
          </View>
        )}

        {/* Speakers (inline, matching web) */}
        {speakers.length > 0 && (
          <View style={styles.speakersSection}>
            <Text style={styles.sectionTitle}>
              {speakers.length === 1 ? "Speaker" : "Speakers"}
            </Text>
            {speakers.map((sp: any) => (
              <TouchableOpacity
                key={sp.id}
                style={styles.speakerCard}
                onPress={() => router.push(`/(app)/speakers/${sp.id}` as any)}
                activeOpacity={0.7}
              >
                <Avatar name={sp.name} size={48} uri={sp.photo} />
                <View style={styles.speakerInfo}>
                  <Text style={styles.speakerName}>{sp.name}</Text>
                  {(sp.title || sp.company) && (
                    <Text style={styles.speakerRole}>
                      {[sp.title, sp.company].filter(Boolean).join(" at ")}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Session Feedback (after session ends) */}
        {sessionEnded && user && (
          <View style={styles.feedbackSection}>
            {existingFeedback || feedbackSubmitted ? (
              <EmptyState icon="checkmark-circle-outline" title="Feedback submitted" subtitle="Thank you for your feedback!" />
            ) : !feedbackForm ? null : (
              <>
                <Text style={styles.sectionTitle}>Session Feedback</Text>
                {(feedbackForm.questions as any[]).map((q: any, idx: number) => (
                  <View key={idx} style={feedbackStyles.questionRow}>
                    <Text style={feedbackStyles.questionLabel}>{q.label || q.question}</Text>
                    {q.type === "rating" || q.type === "star_rating" ? (
                      <StarRating
                        value={(feedbackAnswers[q.id ?? idx] as number) ?? 0}
                        onChange={(v) =>
                          setFeedbackAnswers((prev) => ({ ...prev, [q.id ?? idx]: v }))
                        }
                      />
                    ) : (
                      <TextInput
                        style={feedbackStyles.textInput}
                        placeholder="Your answer..."
                        placeholderTextColor={colors.textMuted}
                        value={(feedbackAnswers[q.id ?? idx] as string) ?? ""}
                        onChangeText={(v) =>
                          setFeedbackAnswers((prev) => ({ ...prev, [q.id ?? idx]: v }))
                        }
                        multiline={q.type === "textarea"}
                      />
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={[shared.buttonPrimary, { marginTop: spacing.lg }]}
                  onPress={() => feedbackMutation.mutate()}
                  disabled={feedbackMutation.isPending}
                >
                  {feedbackMutation.isPending ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={shared.buttonPrimaryText}>Submit Feedback</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Bottom Tabs: Polls / Chat / Community */}
        <View style={styles.bottomTabsContainer}>
          <View style={styles.bottomTabsCard}>
            <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />

            <View style={styles.tabContent}>

          {/* ── Polls Tab ── */}
          {activeTab === "polls" && (
            <View style={styles.section}>
              {polls.length === 0 ? (
                <EmptyState icon="stats-chart-outline" title="No polls yet" subtitle="Polls will appear here when available" />
              ) : (
                polls.map((poll: any) => {
                  const options: { id: string; text: string }[] = Array.isArray(poll.options)
                    ? poll.options
                    : [];
                  const voteCounts = pollVoteCounts[poll.id] ?? {};
                  const userVote = userPollVotes[poll.id];
                  const hasVoted = !!userVote && (userVote.optionIds.length > 0 || !!userVote.responseText || !!userVote.ratingValue);
                  const showResults = hasVoted || poll.status === "closed" || poll.show_results;
                  const totalVotes = Object.values(voteCounts).reduce(
                    (sum: number, c: any) => sum + (c as number),
                    0
                  );

                  return (
                    <View key={poll.id} style={pollStyles.card}>
                      <Text style={pollStyles.question}>{poll.question}</Text>
                      {poll.status === "closed" && (
                        <Badge label="Closed" color={colors.textMuted} backgroundColor={colors.overlay} />
                      )}

                      {(poll.answer_type === "multiple_choice" || poll.answer_type === "checkbox") && (
                        <View style={pollStyles.optionsContainer}>
                          {options.map((opt) => (
                            <PollOptionRow
                              key={opt.id}
                              option={opt}
                              totalVotes={totalVotes}
                              voteCount={voteCounts[opt.id] ?? 0}
                              selected={userVote?.optionIds?.includes(opt.id) ?? false}
                              showResults={showResults}
                              disabled={poll.status === "closed"}
                              onPress={() => {
                                if (poll.status === "open") {
                                  pollVoteMutation.mutate({ pollId: poll.id, optionId: opt.id });
                                }
                              }}
                            />
                          ))}
                        </View>
                      )}

                      {poll.answer_type === "star_rating" && (
                        <View style={{ marginTop: spacing.md, alignItems: "center" }}>
                          <StarRating
                            value={userVote?.ratingValue ?? 0}
                            onChange={(v) => {
                              if (poll.status === "open") {
                                submitPollRating(supabase, {
                                  pollId: poll.id,
                                  userId: user!.id,
                                  ratingValue: v,
                                }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["user-poll-votes", sessionId] });
                                  queryClient.invalidateQueries({ queryKey: ["poll-vote-counts"] });
                                });
                              }
                            }}
                            disabled={poll.status === "closed"}
                          />
                        </View>
                      )}

                      {(poll.answer_type === "word_cloud" || poll.answer_type === "short_answer") && (
                        <View style={{ marginTop: spacing.md }}>
                          {userVote?.responseText ? (
                            <View style={pollStyles.submittedResponse}>
                              <Text style={pollStyles.submittedLabel}>Your response:</Text>
                              <Text style={pollStyles.submittedText}>{userVote.responseText}</Text>
                            </View>
                          ) : null}
                          {poll.status === "open" && (
                            <View style={{ gap: spacing.sm }}>
                              <TextInput
                                style={pollStyles.textInput}
                                placeholder={poll.answer_type === "word_cloud" ? "Enter a word or short phrase..." : "Type your answer..."}
                                placeholderTextColor={colors.textMuted}
                                value={pollTextInputs[poll.id] ?? ""}
                                onChangeText={(v) => setPollTextInputs((prev) => ({ ...prev, [poll.id]: v }))}
                                maxLength={poll.answer_type === "word_cloud" ? 50 : 500}
                                multiline={poll.answer_type === "short_answer"}
                              />
                              <TouchableOpacity
                                style={[pollStyles.submitBtn, !(pollTextInputs[poll.id]?.trim()) && { opacity: 0.4 }]}
                                onPress={() => {
                                  const text = pollTextInputs[poll.id]?.trim();
                                  if (text) {
                                    pollTextMutation.mutate({ pollId: poll.id, responseText: text });
                                  }
                                }}
                                disabled={!(pollTextInputs[poll.id]?.trim()) || pollTextMutation.isPending}
                                activeOpacity={0.7}
                              >
                                {pollTextMutation.isPending ? (
                                  <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                  <Text style={pollStyles.submitBtnText}>
                                    {userVote?.responseText ? "Update" : "Submit"}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}

                      {hasVoted && (
                        <Text style={pollStyles.votedLabel}>You voted</Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ── Community Tab ── */}
          {activeTab === "community" && (
            <View style={styles.section}>
              {communityTopics.length === 0 ? (
                <EmptyState icon="people-outline" title="No topics yet" subtitle="Community discussions will appear here" />
              ) : (
                <>
                  <View style={communityStyles.header}>
                    <Text style={communityStyles.count}>{communityTopics.length} topics</Text>
                    <TouchableOpacity onPress={() => router.push("/(app)/community" as any)} activeOpacity={0.7}>
                      <Text style={communityStyles.viewAll}>View all →</Text>
                    </TouchableOpacity>
                  </View>
                  {[...communityTopics].sort((a: any, b: any) => (b.is_following ? 1 : 0) - (a.is_following ? 1 : 0)).slice(0, 5).map((topic: any) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={communityStyles.topicCard}
                      onPress={() => router.push(`/(app)/community/${topic.id}?returnTo=/schedule/${sessionId}` as any)}
                      activeOpacity={0.7}
                    >
                      <View style={communityStyles.topicIcon}>
                        <Ionicons
                          name={
                            topic.type === "announcement" ? "megaphone-outline" :
                            topic.type === "meetup" ? "location-outline" :
                            topic.type === "ask_organizer" ? "help-circle-outline" :
                            "chatbubble-outline"
                          }
                          size={14}
                          color={colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={communityStyles.topicTitle} numberOfLines={1}>{topic.title}</Text>
                        {topic.description && (
                          <Text style={communityStyles.topicDesc} numberOfLines={1}>{topic.description}</Text>
                        )}
                        <View style={communityStyles.topicMeta}>
                          <Ionicons name="chatbubble-outline" size={11} color={colors.textMuted} />
                          <Text style={communityStyles.topicMetaText}>{topic.post_count ?? 0}</Text>
                          {topic.is_following && (
                            <>
                              <Text style={communityStyles.topicMetaSep}>·</Text>
                              <Ionicons name="checkmark-circle" size={11} color={colors.primary} />
                              <Text style={[communityStyles.topicMetaText, { color: colors.primary }]}>Following</Text>
                            </>
                          )}
                          {topic.has_unread && <View style={communityStyles.unreadDot} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  backRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  likeTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginBottom: spacing.sm,
  },
  likeTopText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  header: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  viewMapLink: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  notesSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  notesCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  notesHeaderText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  descriptionSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  speakersSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  feedbackSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  bottomTabsContainer: {
    marginTop: spacing.xl,
  },
  bottomTabsCard: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    overflow: "hidden",
  },
  tabContent: {
    paddingHorizontal: spacing.md,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
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
});

// ── Note Styles ──
const noteStyles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 180,
    lineHeight: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  saveBtnText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  cancelBtnText: {
    ...typography.buttonSmall,
    color: colors.textMuted,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteBtnText: {
    ...typography.buttonSmall,
    color: colors.error,
  },
  lastSaved: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});

// ── Poll Styles ──
const pollStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  question: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionRow: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  optionSelected: {
    borderColor: colors.primary,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  pctText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  votedLabel: {
    ...typography.small,
    color: colors.success,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 40,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    alignSelf: "flex-end",
  },
  submitBtnText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  submittedResponse: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  submittedLabel: {
    ...typography.captionBold,
    color: colors.primary,
    marginBottom: 4,
  },
  submittedText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});

// ── Chat Styles ──
const chatStyles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bubbleRowOwn: {
    flexDirection: "row-reverse",
  },
  bubble: {
    maxWidth: "75%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderBottomLeftRadius: 4,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: 4,
    borderColor: colors.primary,
  },
  bubbleName: {
    ...typography.captionBold,
    color: colors.primary,
    marginBottom: 2,
  },
  bubbleText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  bubbleTime: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "right",
  },
  composeBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  composeInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── Feedback Styles ──
const feedbackStyles = StyleSheet.create({
  questionRow: {
    marginBottom: spacing.lg,
  },
  questionLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
});

// ── Community Styles ──
const communityStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  viewAll: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  topicCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  topicIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  topicTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  topicDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  topicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  topicMetaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  topicMetaSep: {
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 4,
  },
});
