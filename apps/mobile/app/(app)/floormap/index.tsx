import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { Image } from "expo-image";
import {
  getFloormapsByEvent,
  getFloormapWithMarkers,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shared } from "../../../src/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FloormapScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeMap, setActiveMap] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const { data: floormaps, isLoading } = useQuery({
    queryKey: ["floormaps", currentEvent?.id],
    queryFn: () => getFloormapsByEvent(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const selectedId = activeMap ?? floormaps?.[0]?.id ?? null;

  const { data: floormapDetail } = useQuery({
    queryKey: ["floormap-detail", selectedId],
    queryFn: () => getFloormapWithMarkers(supabase, selectedId!),
    enabled: !!selectedId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["floormaps"] });
    await queryClient.invalidateQueries({ queryKey: ["floormap-detail"] });
    setRefreshing(false);
  };

  const header = (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.pageTitle}>Floor Maps</Text>
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

  if (!floormaps || floormaps.length === 0) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <EmptyState
            icon="map-outline"
            title="No floor maps"
            subtitle="Floor maps for this event have not been uploaded yet"
          />
        </View>
      </SafeAreaView>
    );
  }

  const selectedMap = floormaps.find((m: any) => m.id === selectedId) ?? floormaps[0];
  const markers = (floormapDetail as any)?.floormap_markers ?? [];
  const filteredMarkers = search.trim()
    ? markers.filter((m: any) =>
        m.label.toLowerCase().includes(search.toLowerCase())
      )
    : markers;

  const MAP_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}

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
        {/* Map selector dropdown */}
        {floormaps.length > 1 && (
          <View style={styles.selectRow}>
            <TouchableOpacity
              style={styles.selectTrigger}
              onPress={() => setShowMapPicker(!showMapPicker)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="location"
                size={16}
                color={colors.textMuted}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.selectedText} numberOfLines={1}>
                {selectedMap.name}
              </Text>
              <Ionicons
                name={showMapPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {showMapPicker && (
              <View style={styles.selectDropdown}>
                {floormaps.map((m: any) => {
                  const isActive = m.id === selectedId;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => {
                        setActiveMap(m.id);
                        setSelectedMarker(null);
                        setShowMapPicker(false);
                      }}
                      style={[
                        styles.selectOption,
                        isActive && styles.selectOptionActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          isActive && styles.selectOptionTextActive,
                        ]}
                      >
                        {m.name}
                      </Text>
                      {isActive && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Search locations */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search"
              size={14}
              color={colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search locations..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Locations list */}
        {markers.length > 0 && (
          <View style={styles.locationsSection}>
            <Text style={styles.locationsHeader}>LOCATIONS</Text>
            {filteredMarkers.length > 0 ? (
              filteredMarkers.map((m: any) => {
                const isSelected = selectedMarker === m.label;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.locationItem,
                      isSelected && styles.locationItemActive,
                    ]}
                    onPress={() =>
                      setSelectedMarker(isSelected ? null : m.label)
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location"
                      size={14}
                      color={
                        isSelected ? colors.primary : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.locationLabel,
                        isSelected && styles.locationLabelActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noLocations}>
                No locations match your search.
              </Text>
            )}
          </View>
        )}

        {/* Map name */}
        <View style={styles.mapNameRow}>
          <Text style={styles.mapNameText}>{selectedMap.name}</Text>
        </View>

        {/* Map image with markers */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.zoomContainer}
          >
            <View style={{ width: MAP_WIDTH, height: MAP_WIDTH }}>
              <Image
                source={{ uri: selectedMap.image_url }}
                style={{ width: MAP_WIDTH, height: MAP_WIDTH }}
                contentFit="contain"
                transition={300}
              />
              {/* Render markers on top of image */}
              {markers.map((m: any) => {
                const isSelected = selectedMarker === m.label;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.marker,
                      {
                        left: (m.x / 100) * MAP_WIDTH - 10,
                        top: (m.y / 100) * MAP_WIDTH - 20,
                      },
                      isSelected && styles.markerSelected,
                    ]}
                    onPress={() =>
                      setSelectedMarker(isSelected ? null : m.label)
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location"
                      size={20}
                      color={isSelected ? colors.primary : "#dc2626"}
                    />
                    <View style={styles.markerLabel}>
                      <Text style={styles.markerLabelText}>{m.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.hint}>
          <Ionicons
            name="expand-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.hintText}>Pinch to zoom in on the map</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  menuBtn: {
    padding: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // Scroll
  scrollContent: {
    paddingBottom: 40,
  },

  // Select dropdown
  selectRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  selectedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  selectDropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  selectOptionActive: {
    backgroundColor: colors.primaryMuted,
  },
  selectOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  selectOptionTextActive: {
    color: colors.primary,
    fontWeight: "500",
  },

  // Search
  searchRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
  },

  // Locations
  locationsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  locationsHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  locationItemActive: {
    backgroundColor: colors.primaryMuted,
  },
  locationLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  locationLabelActive: {
    color: colors.primary,
    fontWeight: "500",
  },
  noLocations: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },

  // Map name
  mapNameRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  mapNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  // Map image
  imageContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  zoomContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Markers
  marker: {
    position: "absolute",
    alignItems: "center",
  },
  markerSelected: {
    zIndex: 10,
    transform: [{ scale: 1.2 }],
  },
  markerLabel: {
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 1,
  },
  markerLabelText: {
    fontSize: 10,
    color: colors.white,
  },

  // Hint
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
});
