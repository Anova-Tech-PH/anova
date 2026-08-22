import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
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
import { Badge } from "../../../src/components/badge";
import { EmptyState } from "../../../src/components/empty-state";
import { JoinEventModal } from "../../../src/components/join-event-modal";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const sStr = s.toLocaleDateString("en-US");
  const eStr = e.toLocaleDateString("en-US");
  if (sStr === eStr) return s.toLocaleDateString("en-US", opts);
  return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${e.toLocaleDateString("en-US", opts)}`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

function groupSessionsByDay(sessions: any[]) {
  const groups: Record<string, any[]> = {};
  for (const s of sessions) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    (groups[day] ??= []).push(s);
  }
  return groups;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const { data: sessions } = useQuery({
    queryKey: ["sessions-preview", currentEvent?.id],
    queryFn: () => getEventSessions(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: speakers } = useQuery({
    queryKey: ["speakers-preview", currentEvent?.id],
    queryFn: () => getEventSpeakers(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const { data: attendeeCount } = useQuery({
    queryKey: ["attendee-count", currentEvent?.id],
    queryFn: () => getEventAttendeeCount(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const allSessions = sessions ?? [];
  const allSpeakers = speakers ?? [];
  const dayGroups = useMemo(() => groupSessionsByDay(allSessions), [allSessions]);
  const sessionCount = allSessions.filter((s: any) => s.type !== "break").length;

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
          icon="ticket-outline"
          title="Welcome to Eventriv"
          subtitle="Join an event using the code from your organizer"
        />
        <TouchableOpacity
          style={homeStyles.joinButton}
          onPress={() => setJoinModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.white} />
          <Text style={homeStyles.joinButtonText}>Join with Event Code</Text>
        </TouchableOpacity>
        <JoinEventModal
          visible={joinModalVisible}
          onClose={() => setJoinModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  const orgName = currentEvent.organizations?.name;
  const hasCoverImage = !!currentEvent.cover_image;

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
        {/* ── Hero ── */}
        <View style={[styles.heroContainer, { paddingTop: insets.top }]}>
          {hasCoverImage ? (
            <>
              <Image
                source={{ uri: currentEvent.cover_image! }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.7)"]}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={["rgba(139,61,255,0.08)", "rgba(139,61,255,0.04)", "transparent"]}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Menu button */}
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={hasCoverImage ? colors.white : colors.textPrimary} />
          </TouchableOpacity>

          {/* Org badge */}
          {orgName && (
            <View style={[styles.orgBadge, hasCoverImage && styles.orgBadgeCover]}>
              <View style={styles.pulseDot}>
                <View style={[styles.pulseDotInner, hasCoverImage && styles.pulseDotCover]} />
              </View>
              <Text style={[styles.orgBadgeText, hasCoverImage && styles.orgBadgeTextCover]}>
                {orgName}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.heroTitle, hasCoverImage && styles.heroTitleCover]}>
            {currentEvent.title}
          </Text>

          {/* Meta pills */}
          <View style={styles.heroPills}>
            <View style={[styles.heroPill, hasCoverImage && styles.heroPillCover]}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={hasCoverImage ? colors.white : colors.primary}
              />
              <Text style={[styles.heroPillText, hasCoverImage && styles.heroPillTextCover]}>
                {formatDateRange(currentEvent.start_date, currentEvent.end_date)}
              </Text>
            </View>
            {currentEvent.venue_name && (
              <View style={[styles.heroPill, hasCoverImage && styles.heroPillCover]}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={hasCoverImage ? colors.white : colors.primary}
                />
                <Text style={[styles.heroPillText, hasCoverImage && styles.heroPillTextCover]}>
                  {currentEvent.venue_name}
                </Text>
              </View>
            )}
          </View>

          {/* Quick stats */}
          <View style={styles.heroStats}>
            {(attendeeCount ?? 0) > 0 && (
              <View style={styles.heroStatItem}>
                <Ionicons name="people-outline" size={14} color={hasCoverImage ? "rgba(255,255,255,0.7)" : colors.textMuted} />
                <Text style={[styles.heroStatText, hasCoverImage && styles.heroStatTextCover]}>
                  {attendeeCount} registered
                </Text>
              </View>
            )}
            {allSpeakers.length > 0 && (
              <View style={styles.heroStatItem}>
                <Ionicons name="mic-outline" size={14} color={hasCoverImage ? "rgba(255,255,255,0.7)" : colors.textMuted} />
                <Text style={[styles.heroStatText, hasCoverImage && styles.heroStatTextCover]}>
                  {allSpeakers.length} speakers
                </Text>
              </View>
            )}
            {sessionCount > 0 && (
              <View style={styles.heroStatItem}>
                <Ionicons name="calendar-outline" size={14} color={hasCoverImage ? "rgba(255,255,255,0.7)" : colors.textMuted} />
                <Text style={[styles.heroStatText, hasCoverImage && styles.heroStatTextCover]}>
                  {sessionCount} sessions
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          {/* About the Event */}
          {currentEvent.description && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>About the Event</Text>
              </View>
              <Text style={styles.aboutText}>
                {stripHtml(currentEvent.description)}
              </Text>
            </View>
          )}

          {/* Speakers */}
          {allSpeakers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Speakers</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{allSpeakers.length}</Text>
                </View>
              </View>
              <View style={styles.speakerGrid}>
                {allSpeakers.map((speaker: any) => (
                  <TouchableOpacity
                    key={speaker.id}
                    style={styles.speakerCard}
                    onPress={() => router.push(`/(app)/speakers/${speaker.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Avatar name={speaker.name} size={80} uri={speaker.photo} />
                    <Text style={styles.speakerName}>{speaker.name}</Text>
                    {(speaker.title || speaker.company) && (
                      <Text style={styles.speakerRole}>
                        {[speaker.title, speaker.company].filter(Boolean).join(" at ")}
                      </Text>
                    )}
                    {speaker.bio && (
                      <Text style={styles.speakerBio} numberOfLines={2}>{speaker.bio}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Schedule */}
          {allSessions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Schedule</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{sessionCount} sessions</Text>
                </View>
              </View>
              <View style={styles.scheduleContainer}>
                {Object.entries(dayGroups).map(([day, daySessions]) => (
                  <View key={day} style={styles.dayGroup}>
                    <View style={styles.dayHeader}>
                      <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                      <Text style={styles.dayLabel}>{day}</Text>
                    </View>
                    {daySessions.map((session: any) => {
                      const sessionSpeakers = (session.session_speakers ?? [])
                        .map((ss: any) => ss.speakers)
                        .filter(Boolean);
                      return (
                        <TouchableOpacity
                          key={session.id}
                          style={[
                            styles.scheduleCard,
                            session.type === "break" && styles.scheduleCardBreak,
                            session.track?.color && {
                              borderLeftWidth: 3,
                              borderLeftColor: session.track.color,
                            },
                          ]}
                          onPress={() => router.push(`/(app)/schedule/${session.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.scheduleCardContent}>
                            {session.type && session.type !== "session" && (
                              <View style={styles.scheduleBadgeRow}>
                                <Badge label={session.type} />
                                {session.track && (
                                  <Text style={styles.scheduleTrackName}>{session.track.name}</Text>
                                )}
                              </View>
                            )}
                            <Text style={styles.scheduleTitle}>{session.title}</Text>
                            {session.description && (
                              <Text style={styles.scheduleDesc} numberOfLines={2}>
                                {stripHtml(session.description)}
                              </Text>
                            )}
                            {sessionSpeakers.length > 0 && (
                              <View style={styles.scheduleSpeakers}>
                                {sessionSpeakers.map((sp: any) => (
                                  <View key={sp.id} style={styles.scheduleSpeakerChip}>
                                    <Avatar name={sp.name} size={18} uri={sp.photo} />
                                    <Text style={styles.scheduleSpeakerName}>{sp.name}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                          <View style={styles.scheduleTimeCol}>
                            <View style={styles.scheduleTimeRow}>
                              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                              <Text style={styles.scheduleTime}>{formatTime(session.start_time)}</Text>
                            </View>
                            {session.location && (
                              <View style={styles.scheduleLocationRow}>
                                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                                <Text style={styles.scheduleLocation}>{session.location}</Text>
                              </View>
                            )}
                            {session.location && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  router.navigate("/(app)/floormap" as any);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.viewMapLink}>View Map</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Hero ──
  heroContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: "hidden",
  },
  menuButton: {
    alignSelf: "flex-start",
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  orgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    ...shadows.sm,
  },
  orgBadgeCover: {
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pulseDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pulseDotCover: {
    backgroundColor: colors.white,
  },
  orgBadgeText: {
    ...typography.caption,
    color: colors.primary,
  },
  orgBadgeTextCover: {
    color: colors.white,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.lg,
    letterSpacing: -0.5,
  },
  heroTitleCover: {
    color: colors.white,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.6)",
    ...shadows.sm,
  },
  heroPillCover: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroPillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  heroPillTextCover: {
    color: "rgba(255,255,255,0.8)",
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  heroStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroStatText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  heroStatTextCover: {
    color: "rgba(255,255,255,0.7)",
  },

  // ── Content ──
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xxl,
  },
  section: {},
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginLeft: spacing.xs,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },

  // ── About ──
  aboutText: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.textSecondary,
    lineHeight: 26,
  },

  // ── Speakers (full-width centered cards like web) ──
  speakerGrid: {
    gap: 0,
  },
  speakerCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: spacing.md,
  },
  speakerName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: 12,
  },
  speakerRole: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  speakerBio: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 21,
  },

  // ── Schedule ──
  scheduleContainer: {
    gap: spacing.xl,
  },
  dayGroup: {},
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
  scheduleCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  scheduleCardBreak: {
    backgroundColor: colors.surfaceElevated,
  },
  scheduleCardContent: {
    flex: 1,
    gap: 6,
  },
  scheduleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scheduleTrackName: {
    fontSize: 10,
    color: colors.textMuted,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: 6,
  },
  scheduleDesc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
  },
  scheduleSpeakers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 6,
  },
  scheduleSpeakerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  scheduleSpeakerName: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  scheduleTimeCol: {
    alignItems: "flex-end",
    paddingLeft: spacing.md,
    minWidth: 90,
    gap: 4,
  },
  scheduleTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textMuted,
  },
  scheduleLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scheduleLocation: {
    fontSize: 14,
    color: colors.textMuted,
  },
  viewMapLink: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
});

const homeStyles = StyleSheet.create({
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  joinButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
