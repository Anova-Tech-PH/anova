import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(supabase, user!.id),
    enabled: !!user?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#0d7377" />
      </SafeAreaView>
    );
  }

  const interests: string[] =
    profile?.interests && Array.isArray(profile.interests)
      ? profile.interests
      : [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0d7377"
          />
        }
      >
        <View style={styles.card}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {getInitials(profile?.full_name)}
            </Text>
          </View>
          <Text style={styles.name}>
            {profile?.full_name ?? "No name set"}
          </Text>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
        </View>

        {(profile?.company || profile?.job_title) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Work</Text>
            {profile?.job_title && (
              <Text style={styles.fieldValue}>{profile.job_title}</Text>
            )}
            {profile?.company && (
              <Text style={styles.meta}>{profile.company}</Text>
            )}
          </View>
        )}

        {profile?.bio && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        )}

        {interests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.tagsContainer}>
              {interests.map((tag: string, i: number) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0d737720",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarLargeText: {
    color: "#0d7377",
    fontSize: 28,
    fontWeight: "700",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a2e05",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2e05",
    alignSelf: "flex-start",
  },
  meta: {
    fontSize: 14,
    color: "#6b7280",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  bio: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    alignSelf: "flex-start",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignSelf: "flex-start",
  },
  tag: {
    backgroundColor: "#0d737715",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0d7377",
  },
  signOutButton: {
    marginTop: 12,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
