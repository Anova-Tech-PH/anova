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
  Linking,
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
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
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
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [sayHiText, setSayHiText] = useState("");

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

  // Initialize note text from existing note
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

  // Try to find the speaker's user account via attendee_profiles
  const { data: speakerUserId } = useQuery({
    queryKey: ["speaker-user-lookup", speakerId, currentEvent?.id],
    queryFn: async () => {
      const speakerName = (speaker as any)?.name;
      if (!speakerName || !currentEvent?.id) return null;

      // Look up attendee_profiles matching the speaker name in the same event
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
      if (!speakerUserId) {
        throw new Error("Speaker is not registered as an attendee");
      }

      const result = await createDmConversationMutation(
        supabase,
        currentEvent!.id,
        speakerUserId
      );

      // If there's a "say hi" message, send it
      if (sayHiText.trim()) {
        await supabase.from("messages").insert({
          conversation_id: result.id,
          sender_id: user!.id,
          content: sayHiText.trim(),
        });
        setSayHiText("");
      }

      return result;
    },
    onSuccess: (data) => {
      router.push(`/(app)/messages/${data.id}` as any);
    },
    onError: (err: Error) => {
      Alert.alert("Cannot message", err.message);
    },
  });

  React.useEffect(() => {
    const name = (speaker as any)?.name;
    navigation.setOptions({
      title: name ?? "Speaker",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [speaker, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["speaker-detail", speakerId] }),
      queryClient.invalidateQueries({ queryKey: ["speaker-bookmarks"] }),
      queryClient.invalidateQueries({ queryKey: ["speaker-note", speakerId] }),
    ]);
    setRefreshing(false);
  };

  const handleSaveNote = async () => {
    if (!user || !speakerId) return;
    setNoteSaving(true);
    try {
      await saveSpeakerNote(supabase, user.id, speakerId, noteText);
      queryClient.invalidateQueries({ queryKey: ["speaker-note", speakerId] });
    } catch {
      Alert.alert("Error", "Could not save note");
    }
    setNoteSaving(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !speaker) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="alert-circle-outline" title="Speaker not found" />
      </SafeAreaView>
    );
  }

  const sessions = ((speaker as any).session_speakers ?? [])
    .map((ss: any) => ss.sessions)
    .filter(Boolean);

  const speakerData = speaker as any;

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar name={speakerData.name} size={96} uri={speakerData.photo} />
          <Text style={styles.name}>{speakerData.name}</Text>
          {speakerData.title && (
            <Text style={styles.title}>{speakerData.title}</Text>
          )}
          {speakerData.company && (
            <Text style={styles.company}>{speakerData.company}</Text>
          )}
        </View>

        {/* Action buttons row */}
        {user && currentEvent && (
          <View style={styles.actionRow}>
            {/* Bookmark button */}
            <TouchableOpacity
              style={[styles.actionBtn, isBookmarked && styles.actionBtnActive]}
              onPress={() => bookmarkMutation.mutate()}
              activeOpacity={0.7}
              disabled={bookmarkMutation.isPending}
            >
              <Ionicons
                name={isBookmarked ? "star" : "star-outline"}
                size={20}
                color={isBookmarked ? colors.warning : colors.textSecondary}
              />
              <Text style={[styles.actionBtnText, isBookmarked && styles.actionBtnTextActive]}>
                {isBookmarked ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Social links */}
        {(speakerData.linkedin_url || speakerData.twitter_handle || speakerData.website_url) && (
          <View style={styles.socialRow}>
            {speakerData.linkedin_url && (
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Linking.openURL(speakerData.linkedin_url)}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
              </TouchableOpacity>
            )}
            {speakerData.twitter_handle && (
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Linking.openURL(`https://twitter.com/${speakerData.twitter_handle}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
              </TouchableOpacity>
            )}
            {speakerData.website_url && (
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Linking.openURL(speakerData.website_url)}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bio */}
        {speakerData.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{speakerData.bio}</Text>
          </View>
        )}

        {/* Say Hi / Message section */}
        {user && currentEvent && canMessage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Say Hi</Text>
            <View style={styles.sayHiContainer}>
              <TextInput
                style={styles.sayHiInput}
                placeholder="Write a quick message..."
                placeholderTextColor={colors.textMuted}
                value={sayHiText}
                onChangeText={setSayHiText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !sayHiText.trim() && styles.sendBtnDisabled]}
                onPress={() => dmMutation.mutate()}
                disabled={dmMutation.isPending || !sayHiText.trim()}
                activeOpacity={0.7}
              >
                {dmMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="send" size={18} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notes section */}
        {user && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.notesHeader}
              onPress={() => setNotesExpanded(!notesExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.notesHeaderLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.sectionTitle}>My Notes</Text>
              </View>
              <Ionicons
                name={notesExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {notesExpanded && (
              <View style={styles.notesBody}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Write notes about this speaker..."
                  placeholderTextColor={colors.textMuted}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.saveNoteBtn, noteSaving && { opacity: 0.6 }]}
                  onPress={handleSaveNote}
                  disabled={noteSaving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveNoteBtnText}>
                    {noteSaving ? "Saving..." : "Save Note"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Sessions */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sessions</Text>
            {sessions.map((s: any) => {
              const trackList = (s.tracks ?? []).filter(Boolean);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.sessionCard}
                  onPress={() => router.push(`/(app)/schedule/${s.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionTimeCol}>
                    <Text style={styles.sessionTime}>{formatTime(s.start_time)}</Text>
                    <Text style={styles.sessionEndTime}>{formatTime(s.end_time)}</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={2}>{s.title}</Text>
                    {trackList.length > 0 && (
                      <View style={styles.trackRow}>
                        {trackList.map((t: any) => (
                          <Badge
                            key={t.name}
                            label={t.name}
                            color={t.color || colors.primary}
                            backgroundColor={`${t.color || colors.primary}20`}
                          />
                        ))}
                      </View>
                    )}
                    {s.location && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.locationText}>{s.location}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    gap: spacing.xs,
  },
  name: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  title: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  company: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionBtnActive: {
    borderColor: colors.warning,
    backgroundColor: `${colors.warning}10`,
  },
  actionBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  actionBtnTextActive: {
    color: colors.warning,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  sayHiContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  sayHiInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 44,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  notesHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  notesBody: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
  },
  saveNoteBtn: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  saveNoteBtnText: {
    ...typography.button,
    color: colors.white,
  },
  sessionCard: {
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
  sessionTimeCol: {
    width: 56,
  },
  sessionTime: {
    ...typography.captionBold,
    color: colors.primary,
  },
  sessionEndTime: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  trackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    ...typography.small,
    color: colors.textMuted,
  },
});
