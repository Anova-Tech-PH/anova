import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getPhotos, togglePhotoLike, uploadPhoto } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.lg;
const GAP = spacing.xs;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// ── Upload Helper ─────────────────────────────────────────────────

async function uploadImageToStorage(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split(".").pop()?.split("?")[0] ?? "jpg";
  const fileName = `photos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("event-images")
    .upload(fileName, blob, { contentType: `image/${ext === "png" ? "png" : "jpeg"}` });

  if (error) throw error;

  const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
  return data.publicUrl;
}

// ── Component ─────────────────────────────────────────────────────

export default function PhotosScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["photos", currentEvent?.id],
    queryFn: () => getPhotos(supabase, currentEvent!.id, undefined, user?.id),
    enabled: !!currentEvent?.id,
  });

  const likeMutation = useMutation({
    mutationFn: ({ photoId }: { photoId: string }) =>
      togglePhotoLike(supabase, photoId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["photos"] });
    setRefreshing(false);
  }, [queryClient]);

  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setSelectedImage(result.assets[0].uri);
    setCaption("");
    setUploadModalVisible(true);
  };

  const handleUpload = async () => {
    if (!selectedImage || !currentEvent || !user) return;

    setUploading(true);
    try {
      const imageUrl = await uploadImageToStorage(selectedImage);
      await uploadPhoto(supabase, {
        eventId: currentEvent.id,
        userId: user.id,
        imageUrl,
        caption: caption.trim() || undefined,
      });
      setUploadModalVisible(false);
      setSelectedImage(null);
      setCaption("");
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="calendar-outline"
          title="Select an event"
          subtitle="Go to My Events to choose an event"
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const photos = data?.photos ?? [];

  const renderPhoto = ({ item, index }: { item: any; index: number }) => {
    const isLiked = item.is_liked;
    const isLastInRow = (index + 1) % NUM_COLUMNS === 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/photos/${item.id}` as any)}
        style={[styles.tile, !isLastInRow && { marginRight: GAP }]}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={(e) => {
              e.stopPropagation?.();
              if (user) likeMutation.mutate({ photoId: item.id });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={isLiked ? colors.error : colors.white}
            />
            {item.likes_count > 0 && (
              <Text style={styles.likeCount}>{item.likes_count}</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <FlatList
        data={photos}
        keyExtractor={(item: any) => item.id}
        renderItem={renderPhoto}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
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
            title="No photos yet"
            subtitle="Be the first to share a photo from this event"
          />
        }
      />

      {/* Upload FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={pickImage}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!uploading) {
            setUploadModalVisible(false);
            setSelectedImage(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (!uploading) {
                    setUploadModalVisible(false);
                    setSelectedImage(null);
                  }
                }}
                disabled={uploading}
              >
                <Text style={[styles.modalHeaderAction, uploading && { opacity: 0.4 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Photo</Text>
              <TouchableOpacity onPress={handleUpload} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.modalHeaderAction, { color: colors.primary }]}>
                    Share
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Preview */}
            {selectedImage && (
              <View style={styles.previewWrapper}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}

            {/* Caption Input */}
            <View style={styles.captionRow}>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor={colors.textMuted}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={500}
                editable={!uploading}
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: GRID_PADDING,
    paddingBottom: 80,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginBottom: GAP,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  likeCount: {
    ...typography.small,
    color: colors.white,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.lg,
  },

  // Upload Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalHeaderAction: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  previewWrapper: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  captionRow: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  captionInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 44,
    maxHeight: 100,
  },
});
