import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getAttendeeProfileFull,
  getAttendeeNote,
  getAttendeeBookmarkIds,
  toggleAttendeeBookmark,
  saveAttendeeNote,
  createDmConversationMutation,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const LINK_ICONS: Record<string, string> = {
  linkedin: "logo-linkedin",
  twitter: "logo-twitter",
  github: "logo-github",
  website: "globe-outline",
  other: "link-outline",
};

export default function AttendeeProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [hiMessage, setHiMessage] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["attendee-profile-full", userId, currentEvent?.id],
    queryFn: () => getAttendeeProfileFull(supabase, userId!, currentEvent!.id),
    enabled: !!userId && !!currentEvent?.id,
  });

  const { data: existingNote = "" } = useQuery({
    queryKey: ["attendee-note", userId, user?.id],
    queryFn: () => getAttendeeNote(supabase, user!.id, userId!),
    enabled: !!userId && !!user?.id,
  });

  const { data: bookmarkedIds = [] } = useQuery({
    queryKey: ["attendee-bookmarks", currentEvent?.id, user?.id],
    queryFn: () => getAttendeeBookmarkIds(supabase, user!.id, currentEvent!.id),
    enabled: !!currentEvent?.id && !!user?.id,
  });

  const isBookmarked = bookmarkedIds.includes(userId!);
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (existingNote) {
      setNoteText(existingNote);
    }
  }, [existingNote]);

  useEffect(() => {
    const name = profile?.full_name;
    navigation.setOptions({
      title: name ?? "Attendee",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [profile, navigation]);

  const bookmarkMutation = useMutation({
    mutationFn: () =>
      toggleAttendeeBookmark(supabase, user!.id, userId!, currentEvent!.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["attendee-bookmarks", currentEvent?.id, user?.id] });
      const prev = queryClient.getQueryData<string[]>(["attendee-bookmarks", currentEvent?.id, user?.id]) ?? [];
      const next = prev.includes(userId!)
        ? prev.filter((id) => id !== userId!)
        : [...prev, userId!];
      queryClient.setQueryData(["attendee-bookmarks", currentEvent?.id, user?.id], next);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["attendee-bookmarks", currentEvent?.id, user?.id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendee-bookmarks", currentEvent?.id, user?.id] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: () => saveAttendeeNote(supabase, user!.id, userId!, noteText),
    onSuccess: () => {
      setNoteSaved(true);
      queryClient.invalidateQueries({ queryKey: ["attendee-note", userId, user?.id] });
      setTimeout(() => setNoteSaved(false), 2000);
    },
  });

  const dmMutation = useMutation({
    mutationFn: () =>
      createDmConversationMutation(supabase, currentEvent!.id, userId!),
    onSuccess: (data) => {
      router.push(`/(app)/messages/${data.id}` as any);
    },
  });

  const sayHiMutation = useMutation({
    mutationFn: async () => {
      const msg = hiMessage.trim() || "Hi! Nice to meet you at this event.";
      const conv = await createDmConversationMutation(supabase, currentEvent!.id, userId!);
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: user!.id,
        content: msg,
      });
      return conv;
    },
    onSuccess: (conv) => {
      setHiMessage("");
      Alert.alert("Sent!", "Your message has been sent.");
      router.push(`/(app)/messages/${conv.id}` as any);
    },
    onError: () => {
      Alert.alert("Error", "Could not send message. Please try again.");
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendee-profile-full", userId] }),
      queryClient.invalidateQueries({ queryKey: ["attendee-note", userId] }),
      queryClient.invalidateQueries({ queryKey: ["attendee-bookmarks"] }),
    ]);
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="alert-circle-outline" title="Attendee not found" />
      </SafeAreaView>
    );
  }

  const links = (profile.links as Array<{ type: string; url: string; label?: string }>) ?? [];

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <Avatar
              name={profile.full_name}
              size={96}
              uri={profile.avatar_url}
            />
            <Text style={styles.name}>{profile.full_name}</Text>
            {profile.title && (
              <Text style={styles.title}>{profile.title}</Text>
            )}
            {profile.company && (
              <View style={styles.companyRow}>
                <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                <Text style={styles.company}>{profile.company}</Text>
              </View>
            )}
            {profile.location && (
              <View style={styles.companyRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.locationText}>{profile.location}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {!isOwnProfile && user && currentEvent && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => dmMutation.mutate()}
                activeOpacity={0.7}
                disabled={dmMutation.isPending}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
                <Text style={styles.messageButtonText}>
                  {dmMutation.isPending ? "Opening..." : "Message"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bookmarkActionButton,
                  isBookmarked && styles.bookmarkActionButtonActive,
                ]}
                onPress={() => bookmarkMutation.mutate()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isBookmarked ? "star" : "star-outline"}
                  size={18}
                  color={isBookmarked ? colors.warning : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.bookmarkActionText,
                    isBookmarked && styles.bookmarkActionTextActive,
                  ]}
                >
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Social links */}
          {links.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Links</Text>
              <View style={styles.linksRow}>
                {links.map((link, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.linkChip}
                    onPress={() => Linking.openURL(link.url)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={(LINK_ICONS[link.type] ?? "link-outline") as any}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.linkLabel} numberOfLines={1}>
                      {link.label || link.type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Bio */}
          {profile.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.tagsRow}>
                {profile.interests.map((interest: any) => (
                  <View key={interest.id} style={styles.tag}>
                    <Text style={styles.tagText}>{interest.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Say Hi */}
          {!isOwnProfile && user && currentEvent && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Say Hi</Text>
              <View style={styles.sayHiContainer}>
                <TextInput
                  style={styles.sayHiInput}
                  placeholder="Send a quick message..."
                  placeholderTextColor={colors.textMuted}
                  value={hiMessage}
                  onChangeText={setHiMessage}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sayHiSend,
                    sayHiMutation.isPending && { opacity: 0.5 },
                  ]}
                  onPress={() => sayHiMutation.mutate()}
                  disabled={sayHiMutation.isPending}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={colors.white}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Take Notes */}
          {!isOwnProfile && user && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.notesHeader}
                onPress={() => setNoteExpanded(!noteExpanded)}
                activeOpacity={0.7}
              >
                <View style={styles.notesHeaderLeft}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.sectionTitle}>Take Notes</Text>
                </View>
                <Ionicons
                  name={noteExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {noteExpanded && (
                <View style={styles.notesBody}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Write a private note about this person..."
                    placeholderTextColor={colors.textMuted}
                    value={noteText}
                    onChangeText={(t) => {
                      setNoteText(t);
                      setNoteSaved(false);
                    }}
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                  <View style={styles.noteActions}>
                    {noteSaved && (
                      <View style={styles.savedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={styles.savedText}>Saved</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.saveNoteButton,
                        noteMutation.isPending && { opacity: 0.5 },
                      ]}
                      onPress={() => noteMutation.mutate()}
                      disabled={noteMutation.isPending}
                    >
                      <Text style={styles.saveNoteText}>
                        {noteMutation.isPending ? "Saving..." : "Save Note"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  company: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  locationText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
  },
  messageButtonText: {
    ...typography.button,
    color: colors.white,
  },
  bookmarkActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookmarkActionButtonActive: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  bookmarkActionText: {
    ...typography.buttonSmall,
    color: colors.textSecondary,
  },
  bookmarkActionTextActive: {
    color: colors.warning,
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
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  linkLabel: {
    ...typography.caption,
    color: colors.primary,
    textTransform: "capitalize",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
  },
  sayHiContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadows.sm,
  },
  sayHiInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxHeight: 80,
  },
  sayHiSend: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notesHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  notesBody: {
    marginTop: spacing.sm,
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
    ...shadows.sm,
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  savedText: {
    ...typography.caption,
    color: colors.success,
  },
  saveNoteButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  saveNoteText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});
