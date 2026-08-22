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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getSpeakerDetail,
  toggleSpeakerBookmark,
  getUserSpeakerBookmarks,
  saveSpeakerNote,
  getSpeakerNote,
  createDmConversationMutation,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SpeakerDetailScreen() {
  const { speakerId } = useLocalSearchParams<{ speakerId: string }>();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  // Notes state
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Message state
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  const { data: speaker, isLoading, error } = useQuery({
    queryKey: ["speaker-detail", speakerId],
    queryFn: () => getSpeakerDetail(supabase, speakerId!),
    enabled: !!speakerId,
  });

  const { data: bookmarkedIds = [] } = useQuery({
    queryKey: ["speaker-bookmarks", currentEvent?.id, user?.id],
    queryFn: () => getUserSpeakerBookmarks(supabase, user!.id, currentEvent!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const { data: existingNote } = useQuery({
    queryKey: ["speaker-note", speakerId, user?.id],
    queryFn: async () => {
      const content = await getSpeakerNote(supabase, user!.id, speakerId!);
      return content;
    },
    enabled: !!speakerId && !!user?.id,
  });

  React.useEffect(() => {
    if (existingNote !== undefined && !noteText) {
      setNoteText(existingNote);
    }
  }, [existingNote]);

  const isBookmarked = bookmarkedIds.includes(speakerId!);

  const bookmarkMutation = useMutation({
    mutationFn: () =>
      toggleSpeakerBookmark(supabase, user!.id, speakerId!, currentEvent!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speaker-bookmarks"] });
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: () => saveSpeakerNote(supabase, user!.id, speakerId!, noteText),
    onSuccess: () => {
      setShowNotes(false);
      queryClient.invalidateQueries({ queryKey: ["speaker-note", speakerId] });
    },
  });

  // Look up speaker's user account for messaging
  const { data: speakerUserId } = useQuery({
    queryKey: ["speaker-user-lookup", speakerId, currentEvent?.id],
    queryFn: async () => {
      const speakerName = (speaker as any)?.name;
      if (!speakerName || !currentEvent?.id) return null;
      const { data: profiles } = await supabase
        .from("attendee_profiles")
        .select("id")
        .eq("event_id", currentEvent.id)
        .ilike("display_name", speakerName)
        .limit(1);
      return profiles?.[0]?.id ?? null;
    },
    enabled: !!speaker && !!currentEvent?.id,
  });

  const canMessage = !!speakerUserId && speakerUserId !== user?.id;

  const dmMutation = useMutation({
    mutationFn: async () => {
      if (!speakerUserId) throw new Error("Speaker is not registered as an attendee");
      const result = await createDmConversationMutation(supabase, currentEvent!.id, speakerUserId);
      if (messageText.trim()) {
        await supabase.from("messages").insert({
          conversation_id: result.id,
          sender_id: user!.id,
          content: messageText.trim(),
        });
      }
      return result;
    },
    onSuccess: () => {
      setMessageSent(true);
      setMessageText("");
      setTimeout(() => {
        setShowMessage(false);
        setMessageSent(false);
      }, 2000);
    },
    onError: (err: Error) => {
      Alert.alert("Cannot message", err.message);
    },
  });

  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["speaker-detail", speakerId] }),
      queryClient.invalidateQueries({ queryKey: ["speaker-bookmarks"] }),
      queryClient.invalidateQueries({ queryKey: ["speaker-note", speakerId] }),
    ]);
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !speaker) {
    return (
      <SafeAreaView style={shared.centered} edges={["top", "bottom"]}>
        <EmptyState icon="alert-circle-outline" title="Speaker not found" />
      </SafeAreaView>
    );
  }

  const speakerData = speaker as any;
  const sessions = (speakerData.session_speakers ?? [])
    .map((ss: any) => ss.sessions)
    .filter(Boolean);

  const titleCompany = [speakerData.title, speakerData.company]
    .filter(Boolean)
    .join(" at ");

  return (
    <SafeAreaView style={shared.screen} edges={["top", "bottom"]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/speakers' as any)}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{speakerData.name ?? "Speaker"}</Text>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header: Avatar + Name + Title at Company + Badge (horizontal) */}
        <View style={styles.headerRow}>
          <Avatar name={speakerData.name} size={64} uri={speakerData.photo} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{speakerData.name}</Text>
            {titleCompany ? (
              <Text style={styles.titleCompany}>{titleCompany}</Text>
            ) : null}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Speaker</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        {user && currentEvent && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNotes(!showNotes)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.actionBtnText}>Take Notes</Text>
            </TouchableOpacity>

            {canMessage && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowMessage(!showMessage)}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.actionBtnText}>Say Hi!</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, isBookmarked && styles.actionBtnBookmarked]}
              onPress={() => bookmarkMutation.mutate()}
              activeOpacity={0.7}
              disabled={bookmarkMutation.isPending}
            >
              {bookmarkMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Ionicons
                  name={isBookmarked ? "checkmark" : "bookmark-outline"}
                  size={16}
                  color={isBookmarked ? "#a16207" : colors.textPrimary}
                />
              )}
              <Text style={[styles.actionBtnText, isBookmarked && { color: "#a16207" }]}>
                {isBookmarked ? "Bookmarked" : "Bookmark"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Inline Notes (toggled by Take Notes button) */}
        {showNotes && (
          <View style={styles.inlineSection}>
            <TextInput
              style={styles.noteInput}
              placeholder="Write your notes about this speaker..."
              placeholderTextColor={colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.inlineActions}>
              <TouchableOpacity
                style={styles.saveBtnPrimary}
                onPress={() => saveNoteMutation.mutate()}
                disabled={saveNoteMutation.isPending}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>
                  {saveNoteMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowNotes(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Inline Message (toggled by Say Hi! button) */}
        {showMessage && (
          <View style={styles.inlineSection}>
            {messageSent ? (
              <View style={styles.messageSentRow}>
                <Ionicons name="checkmark" size={16} color={colors.success} />
                <Text style={styles.messageSentText}>Message sent!</Text>
              </View>
            ) : (
              <View style={styles.messageInputRow}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Say something nice..."
                  placeholderTextColor={colors.textMuted}
                  value={messageText}
                  onChangeText={setMessageText}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!messageText.trim() || dmMutation.isPending) && { opacity: 0.5 }]}
                  onPress={() => dmMutation.mutate()}
                  disabled={dmMutation.isPending || !messageText.trim()}
                  activeOpacity={0.7}
                >
                  {dmMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="send" size={14} color={colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Speaking at */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Speaking at</Text>
            {sessions.map((s: any) => (
              <TouchableOpacity
                key={s.id}
                style={styles.sessionRow}
                onPress={() => router.push(`/(app)/schedule/${s.id}` as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.sessionLink}>{s.title}</Text>
                {s.start_time && (
                  <Text style={styles.sessionDate}>{formatDateTime(s.start_time)}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* About */}
        {speakerData.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{speakerData.bio}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  titleCompany: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3b82f6",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  actionBtnBookmarked: {
    backgroundColor: "#fefce8",
    borderColor: "#fde68a",
  },
  actionBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  inlineSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
  },
  inlineActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveBtnPrimary: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontSize: 14,
    color: colors.white,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  messageSentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  messageSentText: {
    fontSize: 14,
    color: colors.success,
  },
  messageInputRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sessionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sessionLink: {
    fontSize: 14,
    color: "#2563eb",
  },
  sessionDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
