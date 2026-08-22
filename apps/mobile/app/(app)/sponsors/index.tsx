import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { getSponsorsByTier } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, spacing, radius, shadows, shared } from "../../../src/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.lg;
const GAP = spacing.md;

function getColumnsForLogoSize(logoSize: string): number {
  switch (logoSize) {
    case "large":
      return 1;
    case "small":
      return 2;
    default:
      return 1;
  }
}

export default function SponsorsScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sponsors", currentEvent?.id],
    queryFn: () => getSponsorsByTier(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sponsors"] });
    setRefreshing(false);
  }, [queryClient]);

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
      <Text style={styles.pageTitle}>{currentEvent?.title ?? "Sponsors"} — Sponsors</Text>
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

  const groups = (data ?? []).filter((g: any) => g.sponsors.length > 0);
  const totalSponsors = groups.reduce((sum: number, g: any) => sum + g.sponsors.length, 0);

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={styles.pageSubtitle}>
          {totalSponsors} sponsor{totalSponsors !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {groups.length === 0 ? (
          <EmptyState
            icon="ribbon-outline"
            title="No sponsors"
            subtitle="Sponsors for this event will appear here"
          />
        ) : (
          groups.map((group: any) => {
            const tierName = group.tier?.name ?? "Sponsors";
            const logoSize = group.tier?.logo_size ?? "medium";
            const cols = getColumnsForLogoSize(logoSize);
            const cardWidth = cols === 2
              ? (SCREEN_WIDTH - GRID_PADDING * 2 - GAP) / 2
              : SCREEN_WIDTH - GRID_PADDING * 2;

            return (
              <View key={group.tier?.id ?? "untiered"} style={styles.tierSection}>
                <Text style={styles.sectionTitle}>{tierName}</Text>
                <View style={cols === 2 ? styles.grid : undefined}>
                  {group.sponsors.map((sponsor: any) => (
                    <TouchableOpacity
                      key={sponsor.id}
                      style={[styles.sponsorCard, { width: cols === 2 ? cardWidth : undefined }]}
                      onPress={() => router.push(`/(app)/sponsors/${sponsor.id}` as any)}
                      activeOpacity={0.7}
                    >
                      {sponsor.logo ? (
                        <Image
                          source={{ uri: sponsor.logo }}
                          style={styles.logo}
                          contentFit="contain"
                          transition={200}
                        />
                      ) : (
                        <View style={[styles.logo, styles.logoPlaceholder]}>
                          <Text style={styles.logoInitial}>
                            {sponsor.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.sponsorName} numberOfLines={1}>{sponsor.name}</Text>
                      {sponsor.description && (
                        <Text style={styles.sponsorDesc} numberOfLines={2}>{sponsor.description}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: spacing.xl,
  },
  tierSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  sponsorCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    marginBottom: GAP,
    ...shadows.sm,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  logoPlaceholder: {
    backgroundColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  logoInitial: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  sponsorName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    textAlign: "center",
  },
  sponsorDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
