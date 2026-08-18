import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../lib/auth-context";
import { useEventContext } from "../lib/event-context";
import { useSidebarData } from "../lib/sidebar-data-context";
import { CollapsibleSection } from "./collapsible-section";
import { CountBadge } from "./badge";
import { Avatar } from "./avatar";
import { colors, typography, spacing, radius, shadows } from "../theme";

type IoniconsName = keyof typeof Ionicons.glyphMap;

function NavItem({
  icon,
  label,
  route,
  isActive,
  badge,
  badgeVariant = "alert",
  indent,
  onPress,
}: {
  icon: IoniconsName;
  label: string;
  route: string;
  isActive: boolean;
  badge?: number;
  badgeVariant?: "alert" | "muted";
  indent?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.navItem,
        isActive && styles.navItemActive,
        indent && styles.navItemIndent,
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isActive ? colors.primary : colors.textMuted}
      />
      <Text
        style={[
          styles.navLabel,
          isActive && styles.navLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <CountBadge count={badge} variant={badgeVariant} />
      )}
    </TouchableOpacity>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

export function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { currentEvent, events, setCurrentEvent } = useEventContext();
  const { sidebarData } = useSidebarData();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const navigate = (route: string) => {
    router.push(route as any);
  };

  const isActive = (route: string) => {
    return pathname === route || pathname.startsWith(route + "/");
  };

  return (
    <View style={styles.container}>
      {/* Event Switcher */}
      <View style={styles.eventSwitcher}>
        <TouchableOpacity
          onPress={() => setSwitcherOpen(!switcherOpen)}
          style={styles.eventSwitcherButton}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.eventIcon}
          >
            <Text style={styles.eventIconText}>
              {currentEvent?.title?.charAt(0)?.toUpperCase() ?? "E"}
            </Text>
          </LinearGradient>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {currentEvent?.title ?? "Select Event"}
            </Text>
          </View>
          <Ionicons
            name={switcherOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {switcherOpen && (
          <View style={styles.switcherDropdown}>
            {events
              .filter((reg) => reg.events?.id !== currentEvent?.id)
              .map((reg) => {
                const ev = reg.events;
                if (!ev) return null;
                return (
                  <TouchableOpacity
                    key={ev.id}
                    onPress={() => {
                      setCurrentEvent(ev);
                      setSwitcherOpen(false);
                    }}
                    style={styles.switcherItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.switcherItemIcon}>
                      <Text style={styles.switcherItemIconText}>
                        {ev.title.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.switcherItemText} numberOfLines={1}>
                      {ev.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            <Separator />
            <TouchableOpacity
              onPress={() => {
                setSwitcherOpen(false);
                navigate("/(app)/my-events");
              }}
              style={styles.switcherItem}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={styles.switcherItemText}>All My Events</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Navigation */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {/* Home */}
        <NavItem
          icon="home-outline"
          label="Home"
          route="/(app)/home"
          isActive={isActive("/(app)/home")}
          onPress={() => navigate("/(app)/home")}
        />

        {/* Agenda */}
        <CollapsibleSection label="Agenda" icon="calendar-outline">
          <NavItem
            icon="calendar-outline"
            label="Sessions"
            route="/(app)/schedule"
            isActive={isActive("/(app)/schedule")}
            onPress={() => navigate("/(app)/schedule")}
            indent
          />
          <NavItem
            icon="mic-outline"
            label="Speakers"
            route="/(app)/speakers"
            isActive={isActive("/(app)/speakers")}
            onPress={() => navigate("/(app)/speakers")}
            indent
          />
        </CollapsibleSection>

        {/* Attendees */}
        <NavItem
          icon="people-outline"
          label="Attendees"
          route="/(app)/attendees"
          isActive={isActive("/(app)/attendees")}
          badge={sidebarData.attendeeCount}
          badgeVariant="muted"
          onPress={() => navigate("/(app)/attendees")}
        />

        {/* Community */}
        <NavItem
          icon="chatbubbles-outline"
          label="Community"
          route="/(app)/community"
          isActive={isActive("/(app)/community")}
          badge={sidebarData.communityCount}
          badgeVariant="muted"
          onPress={() => navigate("/(app)/community")}
        />

        {/* Photos */}
        <NavItem
          icon="camera-outline"
          label="Photos"
          route="/(app)/photos"
          isActive={isActive("/(app)/photos")}
          onPress={() => navigate("/(app)/photos")}
        />

        {/* Sponsors */}
        <NavItem
          icon="business-outline"
          label="Sponsors"
          route="/(app)/sponsors"
          isActive={isActive("/(app)/sponsors")}
          onPress={() => navigate("/(app)/sponsors")}
        />

        {/* Announcements */}
        <NavItem
          icon="megaphone-outline"
          label="Announcements"
          route="/(app)/announcements"
          isActive={isActive("/(app)/announcements")}
          onPress={() => navigate("/(app)/announcements")}
        />

        {/* Volunteer (conditional) */}
        {sidebarData.hasVolunteer && (
          <NavItem
            icon="heart-outline"
            label="Volunteer"
            route="/(app)/volunteer"
            isActive={isActive("/(app)/volunteer")}
            onPress={() => navigate("/(app)/volunteer")}
          />
        )}

        {/* Engagement separator */}
        {(sidebarData.hasLeaderboard || sidebarData.hasContests || sidebarData.hasTrivia || sidebarData.hasPassport) && (
          <Separator />
        )}

        {/* Leaderboard (conditional) */}
        {sidebarData.hasLeaderboard && (
          <NavItem
            icon="trophy-outline"
            label="Leaderboard"
            route="/(app)/leaderboard"
            isActive={isActive("/(app)/leaderboard")}
            onPress={() => navigate("/(app)/leaderboard")}
          />
        )}

        {/* Win a Prize */}
        {(sidebarData.hasContests || sidebarData.hasTrivia || sidebarData.hasPassport) && (
          <CollapsibleSection
            label="Win a Prize"
            icon="gift-outline"
            defaultOpen={
              isActive("/(app)/contests") || isActive("/(app)/trivia") || isActive("/(app)/passport")
            }
          >
            {sidebarData.hasContests && (
              <NavItem
                icon="camera-outline"
                label="Contests"
                route="/(app)/contests"
                isActive={isActive("/(app)/contests")}
                onPress={() => navigate("/(app)/contests")}
                indent
              />
            )}
            {sidebarData.hasTrivia && (
              <NavItem
                icon="bulb-outline"
                label="Trivia"
                route="/(app)/trivia"
                isActive={isActive("/(app)/trivia")}
                onPress={() => navigate("/(app)/trivia")}
                indent
              />
            )}
            {sidebarData.hasPassport && (
              <NavItem
                icon="stamp-outline"
                label="Passport"
                route="/(app)/passport"
                isActive={isActive("/(app)/passport")}
                onPress={() => navigate("/(app)/passport")}
                indent
              />
            )}
          </CollapsibleSection>
        )}

        {/* Resources separator */}
        <Separator />

        {/* Resources */}
        <CollapsibleSection
          label="Resources"
          icon="document-text-outline"
          defaultOpen={
            isActive("/(app)/qa") || isActive("/(app)/resources") ||
            isActive("/(app)/logistics") || isActive("/(app)/rooms") ||
            isActive("/(app)/floormap") || isActive("/(app)/feedback")
          }
        >
          <NavItem
            icon="help-circle-outline"
            label="Session Q&A"
            route="/(app)/qa"
            isActive={isActive("/(app)/qa")}
            onPress={() => navigate("/(app)/qa")}
            indent
          />
          {sidebarData.hasResources && (
            <NavItem
              icon="document-text-outline"
              label="Documents"
              route="/(app)/resources"
              isActive={isActive("/(app)/resources")}
              onPress={() => navigate("/(app)/resources")}
              indent
            />
          )}
          {sidebarData.hasLogistics && (
            <NavItem
              icon="clipboard-outline"
              label="Logistics"
              route="/(app)/logistics"
              isActive={isActive("/(app)/logistics")}
              onPress={() => navigate("/(app)/logistics")}
              indent
            />
          )}
          {sidebarData.hasRooms && (
            <NavItem
              icon="grid-outline"
              label="Rooms"
              route="/(app)/rooms"
              isActive={isActive("/(app)/rooms")}
              onPress={() => navigate("/(app)/rooms")}
              indent
            />
          )}
          <NavItem
            icon="map-outline"
            label="Floormap"
            route="/(app)/floormap"
            isActive={isActive("/(app)/floormap")}
            onPress={() => navigate("/(app)/floormap")}
            indent
          />
          {sidebarData.hasFeedback && (
            <NavItem
              icon="chatbox-ellipses-outline"
              label="Feedback"
              route="/(app)/feedback"
              isActive={isActive("/(app)/feedback")}
              onPress={() => navigate("/(app)/feedback")}
              indent
            />
          )}
        </CollapsibleSection>

        {/* My Stuff separator (auth-only) */}
        {user && (
          <>
            <Separator />
            <CollapsibleSection label="My Stuff" icon="person-outline">
              <NavItem
                icon="bookmark-outline"
                label="My Agenda"
                route="/(app)/my-agenda"
                isActive={isActive("/(app)/my-agenda")}
                onPress={() => navigate("/(app)/my-agenda")}
                indent
              />
              <NavItem
                icon="create-outline"
                label="My Notes"
                route="/(app)/my-notes"
                isActive={isActive("/(app)/my-notes")}
                onPress={() => navigate("/(app)/my-notes")}
                indent
              />
              <NavItem
                icon="chatbubble-outline"
                label="Messages"
                route="/(app)/messages"
                isActive={isActive("/(app)/messages")}
                badge={sidebarData.unreadMessageCount}
                onPress={() => navigate("/(app)/messages")}
                indent
              />
              <NavItem
                icon="person-outline"
                label="Profile"
                route="/(app)/profile"
                isActive={isActive("/(app)/profile")}
                onPress={() => navigate("/(app)/profile")}
                indent
              />
              {sidebarData.hasCertificates && (
                <NavItem
                  icon="ribbon-outline"
                  label="Certificate"
                  route="/(app)/certificate"
                  isActive={isActive("/(app)/certificate")}
                  onPress={() => navigate("/(app)/certificate")}
                  indent
                />
              )}
            </CollapsibleSection>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* User section at bottom */}
      <View style={styles.userSection}>
        {user ? (
          <View style={styles.userRow}>
            <Avatar name={user.email ?? null} size={32} />
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <TouchableOpacity
              onPress={signOut}
              style={styles.signOutButton}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => navigate("/(auth)/sign-in")}
            style={styles.signInButton}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={18} color={colors.textMuted} />
            <Text style={styles.signInText}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  eventSwitcher: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === "ios" ? 54 : 16,
  },
  eventSwitcherButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  eventIconText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  switcherDropdown: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  switcherItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  switcherItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  switcherItemIconText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  switcherItemText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  nav: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  navItemActive: {
    backgroundColor: colors.primaryMuted,
  },
  navItemIndent: {
    paddingLeft: spacing.xl + spacing.lg,
  },
  navLabel: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  userSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 30 : spacing.md,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  userEmail: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
  },
  signOutButton: {
    padding: spacing.sm,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  signInText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
