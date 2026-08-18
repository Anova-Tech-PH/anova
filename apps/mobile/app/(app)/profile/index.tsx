import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@attendly/supabase-client";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from "../../../src/theme";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_SIZE = 96;
const GRADIENT_HEIGHT = 160;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

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
        <ActivityIndicator size="large" color={colors.primary} />
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
            tintColor={colors.primary}
          />
        }
      >
        {/* Gradient header + avatar */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          />
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>
                  {getInitials(profile?.full_name)}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Name & email */}
        <View style={styles.nameSection}>
          <Text style={styles.name}>
            {profile?.full_name ?? "No name set"}
          </Text>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
        </View>

        {/* Info cards */}
        <View style={styles.cardsContainer}>
          {(profile?.company || profile?.job_title) && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="briefcase-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.sectionTitle}>Work</Text>
              </View>
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
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.sectionTitle}>Bio</Text>
              </View>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}

          {interests.length > 0 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="heart-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.sectionTitle}>Interests</Text>
              </View>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header
  headerWrapper: {
    position: "relative",
    marginBottom: AVATAR_OVERLAP + spacing.md,
  },
  gradientHeader: {
    height: GRADIENT_HEIGHT,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  avatarContainer: {
    position: "absolute",
    bottom: -AVATAR_OVERLAP,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  avatarBorder: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.lg,
  },
  avatarGradient: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "700",
  },

  // Name
  nameSection: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  name: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Cards
  cardsContainer: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  tagText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  signOutButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: {
    ...typography.button,
    color: colors.error,
  },
});
