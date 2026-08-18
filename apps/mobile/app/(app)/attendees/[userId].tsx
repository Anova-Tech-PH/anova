import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getProfile, createDmConversationMutation } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function AttendeeProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["attendee-profile", userId],
    queryFn: () => getProfile(supabase, userId!),
    enabled: !!userId,
  });

  React.useEffect(() => {
    const name = (profile as any)?.full_name;
    navigation.setOptions({
      title: name ?? "Attendee",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [profile, navigation]);

  const dmMutation = useMutation({
    mutationFn: () =>
      createDmConversationMutation(supabase, currentEvent!.id, userId!),
    onSuccess: (data) => {
      router.push(`/(app)/messages/${data.id}` as any);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["attendee-profile", userId] });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="alert-circle-outline" title="Attendee not found" />
      </SafeAreaView>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar
            name={(profile as any).full_name}
            size={96}
            uri={(profile as any).avatar_url}
          />
          <Text style={styles.name}>{(profile as any).full_name}</Text>
          {(profile as any).title && (
            <Text style={styles.title}>{(profile as any).title}</Text>
          )}
          {(profile as any).company && (
            <Text style={styles.company}>{(profile as any).company}</Text>
          )}
        </View>

        {/* Message button */}
        {!isOwnProfile && user && currentEvent && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => dmMutation.mutate()}
              activeOpacity={0.7}
              disabled={dmMutation.isPending}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
              <Text style={styles.messageButtonText}>
                {dmMutation.isPending ? "Opening..." : "Message"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bio */}
        {(profile as any).bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{(profile as any).bio}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    gap: spacing.xs,
  },
  name: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  title: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  company: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  actionRow: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
  },
  messageButtonText: {
    ...typography.button,
    color: colors.white,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
