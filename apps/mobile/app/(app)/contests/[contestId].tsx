import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  getContestDetail,
  getContestEntries,
  getUserContestLikes,
  submitContestEntry,
  toggleContestLike,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { Avatar } from "../../../src/components/avatar";
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

// ── Helpers ──────────────────────────────────────────────────────

type ContestType = "photo" | "caption" | "icebreaker";

const TYPE_CONFIG: Record<ContestType, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  photo: { icon: "camera-outline", label: "Photo Contest" },
  caption: { icon: "chatbubble-outline", label: "Caption Contest" },
  icebreaker: { icon: "people-outline", label: "Icebreaker" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as ContestType] ?? { icon: "trophy-outline" as const, label: type };
}

function formatDateRange(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const start = fmt(startsAt);
  if (!endsAt) return start;
  return `${start} — ${fmt(endsAt)}`;
}

const uploadImage = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileName = `contest-entries/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from("photos")
    .upload(fileName, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
  return urlData.publicUrl;
};

// ── Component ────────────────────────────────────────────────────

export default function ContestDetailScreen() {
  const { contestId } = useLocalSearchParams<{ contestId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Back button ──────────────────────────────────────────────
  React.useEffect(() => {
    navigation.setOptions({
      title: "Contest",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // ── Queries ──────────────────────────────────────────────────
  const {
    data: contest,
    isLoading: loadingContest,
  } = useQuery({
    queryKey: ["contestDetail", contestId],
    queryFn: () => getContestDetail(supabase, contestId!),
    enabled: !!contestId,
  });

  const {
    data: entries = [],
    isLoading: loadingEntries,
  } = useQuery({
    queryKey: ["contestEntries", contestId],
    queryFn: () => getContestEntries(supabase, contestId!),
    enabled: !!contestId,
  });

  const { data: likedIds = [] } = useQuery({
    queryKey: ["contestLikes", contestId, user?.id],
    queryFn: () => getUserContestLikes(supabase, contestId!, user!.id),
    enabled: !!contestId && !!user?.id,
  });

  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);

  // ── Mutations ────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: ({ entryId }: { entryId: string }) =>
      toggleContestLike(supabase, entryId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contestEntries", contestId] });
      queryClient.invalidateQueries({ queryKey: ["contestLikes", contestId, user?.id] });
    },
  });

  // ── Handlers ─────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["contestDetail", contestId] }),
      queryClient.invalidateQueries({ queryKey: ["contestEntries", contestId] }),
      queryClient.invalidateQueries({ queryKey: ["contestLikes", contestId, user?.id] }),
    ]);
    setRefreshing(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  const openSubmitModal = () => {
    setCaption("");
    setTextContent("");
    setPickedImageUri(null);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const isPhoto = contest?.type === "photo";

    if (isPhoto && !pickedImageUri) {
      Alert.alert("Image required", "Please pick a photo before submitting.");
      return;
    }
    if (!isPhoto && !textContent.trim()) {
      Alert.alert("Content required", "Please enter your response before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = "";
      if (isPhoto && pickedImageUri) {
        imageUrl = await uploadImage(pickedImageUri);
      }

      await submitContestEntry(supabase, {
        contestId: contestId!,
        userId: user.id,
        imageUrl: isPhoto ? imageUrl : "",
        caption: isPhoto ? caption || undefined : textContent.trim(),
      });

      await queryClient.invalidateQueries({ queryKey: ["contestEntries", contestId] });
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Submission failed", err.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────
  if (loadingContest || loadingEntries) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!contest) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Contest not found"
          subtitle="This contest may have been removed"
        />
      </SafeAreaView>
    );
  }

  const typeConfig = getTypeConfig(contest.type);
  const dateRange = formatDateRange(contest.starts_at, contest.ends_at);
  const isPhoto = contest.type === "photo";

  // ── Render entry ─────────────────────────────────────────────
  const renderEntry = ({ item }: { item: any }) => {
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    const isLiked = likedSet.has(item.id);

    return (
      <View style={styles.entryCard}>
        {/* Author row */}
        <View style={styles.authorRow}>
          <Avatar
            name={profile?.full_name ?? "Unknown"}
            size={32}
            photoUrl={profile?.avatar_url}
          />
          <Text style={styles.authorName} numberOfLines={1}>
            {profile?.full_name ?? "Unknown"}
          </Text>
        </View>

        {/* Photo entries: show image */}
        {isPhoto && item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.entryImage} resizeMode="cover" />
        ) : null}

        {/* Caption / text content */}
        {item.content ? (
          <Text style={styles.entryContent}>{item.content}</Text>
        ) : null}

        {/* Like row */}
        <View style={styles.likeRow}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => likeMutation.mutate({ entryId: item.id })}
            activeOpacity={0.6}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? colors.error : colors.textMuted}
            />
            <Text style={[styles.likeCount, isLiked && { color: colors.error }]}>
              {item.likes_count ?? 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Header component ────────────────────────────────────────
  const ListHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.headerTop}>
        <Badge label={typeConfig.label} />
      </View>
      <Text style={styles.contestTitle}>{contest.title}</Text>
      {contest.description ? (
        <Text style={styles.contestDescription}>{contest.description}</Text>
      ) : null}
      {dateRange ? (
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.dateText}>{dateRange}</Text>
        </View>
      ) : null}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>
        {entries.length} {entries.length === 1 ? "Entry" : "Entries"}
      </Text>
    </View>
  );

  // ── Main render ──────────────────────────────────────────────
  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <FlatList
        data={entries}
        keyExtractor={(item: any) => item.id}
        renderItem={renderEntry}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="camera-outline"
            title="No entries yet"
            subtitle="Be the first to submit an entry!"
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openSubmitModal} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Submit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Entry</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {isPhoto ? (
              <>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.7}>
                  {pickedImageUri ? (
                    <Image source={{ uri: pickedImageUri }} style={styles.pickedImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="image-outline" size={40} color={colors.textMuted} />
                      <Text style={styles.imagePickerText}>Tap to select a photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Add a caption (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={280}
                />
              </>
            ) : (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={contest.type === "caption" ? "Write your caption..." : "Share your response..."}
                placeholderTextColor={colors.textMuted}
                value={textContent}
                onChangeText={setTextContent}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            )}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    paddingBottom: 80,
  },

  // Header section
  headerSection: {
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  contestTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  contestDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },

  // Entry card
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  authorName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  entryImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.borderLight,
  },
  entryContent: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  likeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  likeCount: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  // Image picker
  imagePicker: {
    marginBottom: spacing.md,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  imagePickerPlaceholder: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
  },
  imagePickerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  pickedImage: {
    width: "100%",
    height: 200,
  },

  // Inputs
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 120,
  },

  // Submit button
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    ...typography.button,
  },
});
