import React, { useState, useMemo } from "react";
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
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSpeakers } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function SpeakersScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: speakers = [], isLoading } = useQuery({
    queryKey: ["speakers", currentEvent?.id],
    queryFn: () => getSpeakers(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const filtered = useMemo(() => {
    if (!search) return speakers;
    const q = search.toLowerCase();
    return speakers.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.title?.toLowerCase().includes(q) ||
        s.company?.toLowerCase().includes(q)
    );
  }, [speakers, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["speakers"] });
    setRefreshing(false);
  };

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="mic-outline" title="Select an event" subtitle="Go to My Events to choose an event" />
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

  const renderSpeaker = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.speakerCard}
      onPress={() => router.push(`/(app)/speakers/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <Avatar name={item.name} size={56} uri={item.photo} />
      <View style={styles.speakerInfo}>
        <Text style={styles.speakerName} numberOfLines={1}>{item.name}</Text>
        {item.title && (
          <Text style={styles.speakerTitle} numberOfLines={1}>{item.title}</Text>
        )}
        {item.company && (
          <Text style={styles.speakerCompany} numberOfLines={1}>{item.company}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search speakers..." />
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSpeaker}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="mic-outline" title="No speakers found" subtitle="Try adjusting your search" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  speakerCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  speakerInfo: {
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 2,
  },
  speakerName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: "center",
  },
  speakerTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  speakerCompany: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },
});
