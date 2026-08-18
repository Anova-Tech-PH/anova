import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getFloormapsByEvent } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { TabBar } from "../../../src/components/tab-bar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FloormapScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeMap, setActiveMap] = useState<string | null>(null);

  const { data: floormaps, isLoading } = useQuery({
    queryKey: ["floormaps", currentEvent?.id],
    queryFn: () => getFloormapsByEvent(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["floormaps"] });
    setRefreshing(false);
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

  if (!floormaps || floormaps.length === 0) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="map-outline"
          title="No floor maps"
          subtitle="Floor maps for this event have not been uploaded yet"
        />
      </SafeAreaView>
    );
  }

  const selectedId = activeMap ?? floormaps[0]?.id ?? null;
  const selectedMap = floormaps.find((m: any) => m.id === selectedId) ?? floormaps[0];

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Tab selector for multiple maps */}
      {floormaps.length > 1 && (
        <TabBar
          tabs={floormaps.map((m: any) => ({ key: m.id, label: m.name }))}
          activeTab={selectedId ?? ""}
          onTabPress={setActiveMap}
        />
      )}

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
        {/* Map name header */}
        <View style={styles.header}>
          <Ionicons name="map" size={20} color={colors.primary} />
          <Text style={styles.mapName}>{selectedMap.name}</Text>
        </View>

        {/* Map image with scroll-based zoom */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.zoomContainer}
          >
            <Image
              source={{ uri: selectedMap.image_url }}
              style={styles.mapImage}
              contentFit="contain"
              transition={300}
            />
          </ScrollView>
        </View>

        <View style={styles.hint}>
          <Ionicons name="expand-outline" size={16} color={colors.textMuted} />
          <Text style={styles.hintText}>Pinch to zoom in on the map</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  mapName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  imageContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  zoomContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  mapImage: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: SCREEN_WIDTH - spacing.lg * 2,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  hintText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
