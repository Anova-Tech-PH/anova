import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getPublicVolunteerInfo, applyAsVolunteer } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { Badge } from "../../../src/components/badge";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function VolunteerScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [name, setName] = useState(user?.user_metadata?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: volunteerInfo, isLoading } = useQuery({
    queryKey: ["volunteer-info", currentEvent?.id],
    queryFn: () => getPublicVolunteerInfo(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      applyAsVolunteer(supabase, {
        eventId: currentEvent!.id,
        userId: user!.id,
        email,
        name,
        phone: phone || undefined,
        organization: organization || undefined,
        roleIds: selectedRoles.length > 0 ? selectedRoles : undefined,
        answers: Object.entries(questionAnswers)
          .filter(([_, v]) => v.trim())
          .map(([questionId, answerText]) => ({ questionId, answerText })),
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["volunteer-info"] });
    setRefreshing(false);
  };

  const headerBlock = (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.pageTitle}>Volunteer</Text>
    </View>
  );

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {headerBlock}
        <View style={shared.centered}>
          <EmptyState
            icon="calendar-outline"
            title="Select an event"
            subtitle="Go to My Events to choose an event"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {headerBlock}
        <View style={shared.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!volunteerInfo) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {headerBlock}
        <View style={shared.centered}>
          <EmptyState
            icon="heart-outline"
            title="Volunteering not available"
            subtitle="Volunteer signups have not been enabled for this event"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {headerBlock}
        <View style={shared.centered}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for volunteering. The event organizers will review your application and get back to you.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const { settings, roles, questions } = volunteerInfo;

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {headerBlock}
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
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="heart" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>Volunteer Signup</Text>
          {settings.description && (
            <Text style={styles.headerDescription}>{settings.description}</Text>
          )}
        </View>

        {/* Contact info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={shared.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email *</Text>
            <TextInput
              style={shared.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={shared.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Organization</Text>
            <TextInput
              style={shared.input}
              value={organization}
              onChangeText={setOrganization}
              placeholder="(optional)"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Roles */}
        {roles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Roles</Text>
            <Text style={styles.sectionHint}>Select the roles you are interested in</Text>
            <View style={styles.rolesGrid}>
              {roles.map((role: any) => {
                const isSelected = selectedRoles.includes(role.id);
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleChip, isSelected && styles.roleChipSelected]}
                    onPress={() => toggleRole(role.id)}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={isSelected ? colors.white : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.roleChipText,
                        isSelected && styles.roleChipTextSelected,
                      ]}
                    >
                      {role.name}
                    </Text>
                    {role.spots_available != null && (
                      <Badge
                        label={`${role.spots_available} spots`}
                        color={role.spots_available > 0 ? colors.success : colors.error}
                        backgroundColor={role.spots_available > 0 ? colors.successSoft : colors.errorSoft}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Custom questions */}
        {questions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Questions</Text>
            {questions.map((q: any) => (
              <View key={q.id} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {q.question_text}
                  {q.is_required && " *"}
                </Text>
                <TextInput
                  style={[shared.input, styles.multilineInput]}
                  value={questionAnswers[q.id] ?? ""}
                  onChangeText={(text) =>
                    setQuestionAnswers((prev) => ({ ...prev, [q.id]: text }))
                  }
                  placeholder="Your answer..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>
        )}

        {/* Submit */}
        {user ? (
          <TouchableOpacity
            style={[
              shared.buttonPrimary,
              styles.submitBtn,
              (!name.trim() || !email.trim()) && styles.submitBtnDisabled,
            ]}
            onPress={() => applyMutation.mutate()}
            disabled={!name.trim() || !email.trim() || applyMutation.isPending}
          >
            {applyMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={shared.buttonPrimaryText}>Submit Application</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.authPrompt}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.textMuted} />
            <Text style={styles.authText}>Sign in to apply as a volunteer</Text>
          </View>
        )}

        {applyMutation.isError && (
          <Text style={styles.errorText}>
            Failed to submit application. Please try again.
          </Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  menuBtn: {
    padding: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  headerDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  roleChipTextSelected: {
    color: colors.white,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  authPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  authText: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});
