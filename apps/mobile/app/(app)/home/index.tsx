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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEventSessions, getEventSpeakers, getEventAttendeeCount } from "@attendly/supabase-client";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function HomeScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions-preview", currentEvent?.id],
    queryFn: () => getEventSessions(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: speakers, isLoading: speakersLoading } = useQuery({
    queryKey: ["speakers-preview", currentEvent?.id],
    queryFn: () => getEventSpeakers(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: attendeeCount } = useQuery({
    queryKey: ["attendee-count", currentEvent?.id],
    queryFn: () => getEventAttendeeCount(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sessions-preview"] });
    await queryClient.invalidateQueries({ queryKey: ["speakers-preview"] });
    await queryClient.invalidateQueries({ queryKey: ["attendee-count"] });
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

  const isLoading = sessionsLoading || speakersLoading;
  const upcomingSessions = (sessions ?? [])
    .filter((s: any) => new Date(s.start_time) > new Date())
    .slice(0, 3);
  const topSpeakers = (speakers ?? []).slice(0, 6);

  return (
    <View style={shared.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero */}
        <LinearGradient
          colors={["#6a2cc0", "#c4206e", "#d06a28"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
        >
          {/* Decorative circles */}
          <View style={styles.decoContainer}>
            <View style={[styles.decoCircle, styles.decoCircle1]} />
            <View style={[styles.decoCircle, styles.decoCircle2]} />
            <View style={[styles.decoCircle, styles.decoCircle3]} />
          </View>

          {/* Header row */}
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.white} />
          </TouchableOpacity>

          <Text style={styles.heroTitle}>{currentEvent.title}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaRow}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>
                {new Date(currentEvent.start_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            {currentEvent.venue_name && (
              <View style={styles.heroMetaRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroMetaText}>{currentEvent.venue_name}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{attendeeCount ?? 0}</Text>
            <Text style={styles.statLabel}>Attendees</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sessions?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{speakers?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Speakers</Text>
          </View>
        </View>

        {/* Speakers Showcase */}
        {topSpeakers.length > 0 && (
          <View style={styles.section}>
            <View style={shared.sectionHeader}>
              <Text style={styles.sectionTitle}>Speakers</Text>
              <TouchableOpacity onPress={() => router.push("/(app)/speakers" as any)}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speakersRow}>
              {topSpeakers.map((speaker: any) => (
                <TouchableOpacity
                  key={speaker.id}
                  style={styles.speakerCard}
                  onPress={() => router.push(`/(app)/speakers/${speaker.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Avatar name={speaker.name} size={56} />
                  <Text style={styles.speakerName} numberOfLines={1}>{speaker.name}</Text>
                  {speaker.title && (
                    <Text style={styles.speakerTitle} numberOfLines={1}>{speaker.title}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <View style={styles.section}>
            <View style={shared.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
              <TouchableOpacity onPress={() => router.push("/(app)/schedule" as any)}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sessionsList}>
              {upcomingSessions.map((session: any) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => router.push(`/(app)/schedule/${session.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sessionTime}>
                    {new Date(session.start_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={2}>{session.title}</Text>
                    {session.location && (
                      <Text style={styles.sessionLocation}>{session.location}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    overflow: "hidden",
  },
  menuButton: {
    alignSelf: "flex-start",
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  decoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  decoCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  decoCircle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -60,
  },
  decoCircle2: {
    width: 140,
    height: 140,
    bottom: -30,
    left: -40,
  },
  decoCircle3: {
    width: 80,
    height: 80,
    top: 20,
    left: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroTitle: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.md,
  },
  heroMeta: {
    gap: spacing.sm,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroMetaText: {
    ...typography.caption,
    color: "rgba(255,255,255,0.9)",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    ...shadows.md,
  },
  statNumber: {
    ...typography.h2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  seeAllText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  speakersRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  speakerCard: {
    width: 90,
    alignItems: "center",
    gap: spacing.xs,
  },
  speakerName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  speakerTitle: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },
  sessionsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sessionTime: {
    ...typography.captionBold,
    color: colors.primary,
    width: 60,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  sessionLocation: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
