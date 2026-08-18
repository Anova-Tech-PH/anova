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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getPhotos, togglePhotoLike } from "@attendly/supabase-client";
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

export default function PhotosScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

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
      <View style={[styles.tile, !isLastInRow && { marginRight: GAP }]}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => {
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
      </View>
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
            subtitle="Photos shared at this event will appear here"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: GRID_PADDING,
    paddingBottom: 40,
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
});
