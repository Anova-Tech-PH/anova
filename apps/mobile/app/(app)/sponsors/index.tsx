import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getSponsorsByTier } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function SponsorsScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
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

  const groups = data ?? [];
  const sections = groups
    .filter((g: any) => g.sponsors.length > 0)
    .map((g: any) => ({
      title: g.tier?.name ?? "Sponsors",
      data: g.sponsors,
    }));

  const renderSponsor = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.sponsorCard}
      onPress={() => router.push(`/(app)/sponsors/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {item.logo_url ? (
        <Image
          source={{ uri: item.logo_url }}
          style={styles.logo}
          contentFit="contain"
          transition={200}
        />
      ) : (
        <View style={[styles.logo, styles.logoPlaceholder]}>
          <Ionicons name="business-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.sponsorInfo}>
        <Text style={styles.sponsorName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.tagline && (
          <Text style={styles.sponsorTagline} numberOfLines={2}>
            {item.tagline}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSponsor}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={shared.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="ribbon-outline"
            title="No sponsors"
            subtitle="Sponsors for this event will appear here"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sponsorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
  },
  logoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  sponsorInfo: {
    flex: 1,
    gap: 2,
  },
  sponsorName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  sponsorTagline: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
