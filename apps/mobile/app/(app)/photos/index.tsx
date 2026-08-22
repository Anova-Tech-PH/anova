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
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { getPhotos, togglePhotoLike, uploadPhoto } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const NUM_COLUMNS = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.lg;
const GAP = spacing.md;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type Tab = "all" | "photos" | "videos";

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
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
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

  const header = (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.pageTitle}>Photos</Text>
    </View>
  );

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <EmptyState
            icon="calendar-outline"
            title="Select an event"
            subtitle="Go to My Events to choose an event"
          />
        </View>
      </SafeAreaView>
    );
  }

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

  const allPhotos = data?.photos ?? [];

  // Filter by tab
  const photos = activeTab === "all"
    ? allPhotos
    : allPhotos.filter((p: any) =>
        activeTab === "photos" ? p.media_type !== "video" : p.media_type === "video"
      );

  const photosCount = allPhotos.filter((p: any) => p.media_type !== "video").length;
  const videosCount = allPhotos.filter((p: any) => p.media_type === "video").length;

  const tabs: { key: Tab; label: string; count: number; icon: string }[] = [
    { key: "all", label: "All Media", count: allPhotos.length, icon: "camera-outline" },
    { key: "photos", label: "Photos", count: photosCount, icon: "image-outline" },
    { key: "videos", label: "Videos", count: videosCount, icon: "film-outline" },
  ];

  const renderPhoto = ({ item, index }: { item: any; index: number }) => {
    const isLiked = item.is_liked;
    const isLastInRow = (index + 1) % NUM_COLUMNS === 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/photos/${item.id}` as any)}
        style={[styles.card, !isLastInRow && { marginRight: GAP }]}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
          {/* Gradient overlay */}
          <View style={styles.gradientOverlay}>
            <View style={styles.overlayContent}>
              <Text style={styles.authorText} numberOfLines={1}>
                By {item.author?.display_name ?? "Unknown"}
              </Text>
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
                  size={16}
                  color={isLiked ? "#ef4444" : colors.white}
                />
                {item.likes_count > 0 && (
                  <Text style={styles.likeCount}>{item.likes_count}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText} numberOfLines={2}>{item.caption}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={styles.menuBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={pickImage}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.shareBtnText}>Share a photo</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.pageTitle}>Photos</Text>
        <Text style={styles.pageSubtitle}>
          {allPhotos.length} {allPhotos.length === 1 ? "photo" : "photos"}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <Text style={styles.tabCount}>({tab.count})</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid */}
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
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  menuBtn: {
    padding: 4,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  grid: {
    padding: GRID_PADDING,
    paddingBottom: 40,
  },
  card: {
    width: TILE_SIZE,
    marginBottom: GAP,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  overlayContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.white,
    flex: 1,
    marginRight: 8,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    color: colors.white,
  },
  captionContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  captionText: {
    fontSize: 12,
    color: colors.textMuted,
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
