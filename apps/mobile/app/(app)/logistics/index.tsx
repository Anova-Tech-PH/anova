import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { getLogisticsItems } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  transportation: "car-outline",
  parking: "car-sport-outline",
  accommodation: "bed-outline",
  food: "restaurant-outline",
  wifi: "wifi-outline",
  shuttle: "bus-outline",
  emergency: "medkit-outline",
  contact: "call-outline",
  general: "information-circle-outline",
};

export default function LogisticsScreen() {
  const navigation = useNavigation();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["logistics", currentEvent?.id],
    queryFn: () => getLogisticsItems(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["logistics"] });
    setRefreshing(false);
  };

  const getIcon = (category: string | null) => {
    if (!category) return "information-circle-outline";
    return CATEGORY_ICONS[category.toLowerCase()] ?? "information-circle-outline";
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.iconCol}>
        <Ionicons
          name={getIcon(item.category)}
          size={24}
          color={colors.primary}
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </Text>
          </View>
        )}
        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}
        {item.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
        )}
        {item.contact_info && (
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.contact_info}</Text>
          </View>
        )}
        {item.url && (
          <View style={styles.metaRow}>
            <Ionicons name="link-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.primary }]} numberOfLines={1}>
              {item.url}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderContent = () => {
    if (!currentEvent) {
      return (
        <View style={shared.centered}>
          <EmptyState
            icon="calendar-outline"
            title="Select an event"
            subtitle="Go to My Events to choose an event"
          />
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={shared.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <FlatList
        data={items ?? []}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title="No logistics info"
            subtitle="Logistics information for this event has not been added yet"
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Custom Header */}
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
        <Text style={styles.pageTitle}>Logistics</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  iconCol: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryText: {
    ...typography.small,
    color: colors.primary,
  },
  itemDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
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
});
