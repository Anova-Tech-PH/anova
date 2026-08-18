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
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getSessionsWithQA } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { SearchBar } from "../../../src/components/search-bar";
import { CountBadge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionQAListScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions-with-qa", currentEvent?.id, search],
    queryFn: () =>
      getSessionsWithQA(supabase, currentEvent!.id, {
        search: search || undefined,
      }),
    enabled: !!currentEvent?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sessions-with-qa"] });
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

  const renderSession = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => router.push(`/(app)/qa/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.iconCol}>
        <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.sessionContent}>
        <Text style={styles.sessionTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.sessionTime}>
          {formatTime(item.start_time)} - {formatTime(item.end_time)}
        </Text>
      </View>
      <View style={styles.countCol}>
        <Text style={styles.questionCount}>{item.question_count}</Text>
        <Text style={styles.questionLabel}>
          {item.question_count === 1 ? "question" : "questions"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search sessions..."
      />

      <FlatList
        data={sessions ?? []}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSession}
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
            icon="help-circle-outline"
            title="No Q&A sessions"
            subtitle="Sessions with Q&A enabled will appear here"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sessionCard: {
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
  iconCol: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionContent: {
    flex: 1,
  },
  sessionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  sessionTime: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  countCol: {
    alignItems: "center",
  },
  questionCount: {
    ...typography.h3,
    color: colors.primary,
  },
  questionLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
});
