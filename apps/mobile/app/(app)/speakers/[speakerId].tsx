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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getSpeakerDetail } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { Avatar } from "../../../src/components/avatar";
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SpeakerDetailScreen() {
  const { speakerId } = useLocalSearchParams<{ speakerId: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const { data: speaker, isLoading, error } = useQuery({
    queryKey: ["speaker-detail", speakerId],
    queryFn: () => getSpeakerDetail(supabase, speakerId!),
    enabled: !!speakerId,
  });

  React.useEffect(() => {
    const name = (speaker as any)?.name;
    navigation.setOptions({
      title: name ?? "Speaker",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [speaker, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["speaker-detail", speakerId] });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !speaker) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState icon="alert-circle-outline" title="Speaker not found" />
      </SafeAreaView>
    );
  }

  const sessions = ((speaker as any).session_speakers ?? [])
    .map((ss: any) => ss.sessions)
    .filter(Boolean);

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar name={(speaker as any).name} size={96} uri={(speaker as any).photo} />
          <Text style={styles.name}>{(speaker as any).name}</Text>
          {(speaker as any).title && (
            <Text style={styles.title}>{(speaker as any).title}</Text>
          )}
          {(speaker as any).company && (
            <Text style={styles.company}>{(speaker as any).company}</Text>
          )}
        </View>

        {/* Bio */}
        {(speaker as any).bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{(speaker as any).bio}</Text>
          </View>
        )}

        {/* Sessions */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sessions</Text>
            {sessions.map((s: any) => {
              const trackList = (s.tracks ?? []).filter(Boolean);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.sessionCard}
                  onPress={() => router.push(`/(app)/schedule/${s.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionTimeCol}>
                    <Text style={styles.sessionTime}>{formatTime(s.start_time)}</Text>
                    <Text style={styles.sessionEndTime}>{formatTime(s.end_time)}</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={2}>{s.title}</Text>
                    {trackList.length > 0 && (
                      <View style={styles.trackRow}>
                        {trackList.map((t: any) => (
                          <Badge
                            key={t.name}
                            label={t.name}
                            color={t.color || colors.primary}
                            backgroundColor={`${t.color || colors.primary}20`}
                          />
                        ))}
                      </View>
                    )}
                    {s.location && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.locationText}>{s.location}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
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
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sessionTimeCol: {
    width: 56,
  },
  sessionTime: {
    ...typography.captionBold,
    color: colors.primary,
  },
  sessionEndTime: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  trackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    ...typography.small,
    color: colors.textMuted,
  },
});
