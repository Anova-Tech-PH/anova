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
import { getEventAttendees } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function AttendeesScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["attendees", currentEvent?.id],
    queryFn: () => getEventAttendees(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const filtered = useMemo(() => {
    // Filter out attendees with no name
    const withNames = attendees.filter((a: any) => a.full_name);
    if (!search) return withNames;
    const q = search.toLowerCase();
    return withNames.filter(
      (a: any) =>
        a.full_name?.toLowerCase().includes(q) ||
        a.title?.toLowerCase().includes(q) ||
        a.company?.toLowerCase().includes(q)
    );
  }, [attendees, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["attendees"] });
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

  const renderAttendee = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.attendeeCard}
      onPress={() => router.push(`/(app)/attendees/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <Avatar name={item.full_name} size={48} uri={item.avatar_url} />
      <View style={styles.attendeeInfo}>
        <Text style={styles.attendeeName} numberOfLines={1}>
          {item.full_name}
        </Text>
        {item.title && (
          <Text style={styles.attendeeTitle} numberOfLines={1}>
            {item.title}
          </Text>
        )}
        {item.company && (
          <Text style={styles.attendeeCompany} numberOfLines={1}>
            {item.company}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search attendees..." />
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderAttendee}
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
            icon="people-outline"
            title="No attendees found"
            subtitle="Try adjusting your search"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  attendeeCard: {
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
  attendeeInfo: {
    flex: 1,
    gap: 2,
  },
  attendeeName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  attendeeTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  attendeeCompany: {
    ...typography.small,
    color: colors.textMuted,
  },
});
