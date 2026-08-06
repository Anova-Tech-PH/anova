import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEventAttendees } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PeopleScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const { data: attendees, isLoading } = useQuery({
    queryKey: ["people", currentEvent?.id],
    queryFn: () => getEventAttendees(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const filtered = useMemo(() => {
    if (!attendees) return [];
    const list = attendees.filter(
      (a: { id: string }) => a.id !== user?.id
    );
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (a: { full_name: string | null; company: string | null }) =>
        (a.full_name?.toLowerCase().includes(q) ?? false) ||
        (a.company?.toLowerCase().includes(q) ?? false)
    );
  }, [attendees, search, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: ["people", currentEvent?.id],
    });
    setRefreshing(false);
  };

  if (!currentEvent) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <Text style={styles.emptyTitle}>Select an event from My Events</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#0d7377" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or company..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item: { id: string }) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0d7377"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No attendees found</Text>
          </View>
        }
        renderItem={({
          item,
        }: {
          item: {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            company: string | null;
            job_title: string | null;
          };
        }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(item.full_name)}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.full_name ?? "Unknown"}</Text>
              {(item.job_title || item.company) && (
                <Text style={styles.meta} numberOfLines={1}>
                  {[item.job_title, item.company].filter(Boolean).join(" at ")}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8faf5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8faf5",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a2e05",
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0d737720",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#0d7377",
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a2e05",
  },
  meta: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2e05",
  },
});
