import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { getProfile, getAttendeeContactInfo, updateProfileMutation, updateAttendeeContactInfo } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  shared,
} from "../../../src/theme";

// ── Avatar Upload Helper ──────────────────────────────────────────

async function uploadAvatar(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split(".").pop()?.split("?")[0] ?? "jpg";
  const fileName = `avatars/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("event-images")
    .upload(fileName, blob, { contentType: `image/${ext === "png" ? "png" : "jpeg"}` });

  if (error) throw error;

  const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
  return data.publicUrl;
}

// ── Component ─────────────────────────────────────────────────────

const AVATAR_SIZE = 88;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Contact fields
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(supabase, user!.id),
    enabled: !!user?.id,
  });

  const { data: contactInfo } = useQuery({
    queryKey: ["attendee-contact", user?.id, currentEvent?.id],
    queryFn: () => getAttendeeContactInfo(supabase, user!.id, currentEvent!.id),
    enabled: !!user?.id && !!currentEvent?.id,
  });

  // Sync fetched profile into form state
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setBio(profile.bio ?? "");
      setJobTitle(profile.job_title ?? "");
      setCompany(profile.company ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
      setDirty(false);
    }
  }, [profile]);

  useEffect(() => {
    if (contactInfo) {
      setPhone(contactInfo.phone ?? "");
      setContactEmail(contactInfo.contact_email ?? "");
      setAddress(contactInfo.address ?? "");
      setShowPhone(contactInfo.show_phone ?? false);
      setShowEmail(contactInfo.show_email ?? false);
      setShowAddress(contactInfo.show_address ?? false);
    }
  }, [contactInfo]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateProfileMutation(supabase, user!.id, {
        full_name: fullName.trim(),
        avatar_url: avatarUrl ?? undefined,
        bio: bio.trim(),
        company: company.trim(),
        job_title: jobTitle.trim(),
      });
      if (currentEvent?.id) {
        await updateAttendeeContactInfo(supabase, user!.id, currentEvent.id, {
          phone: phone.trim(),
          contact_email: contactEmail.trim(),
          address: address.trim(),
          show_phone: showPhone,
          show_email: showEmail,
          show_address: showAddress,
        });
      }
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["attendee-contact", user?.id, currentEvent?.id] });
      Alert.alert("Saved", "Your profile has been updated.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["attendee-contact", user?.id, currentEvent?.id] }),
    ]);
    setRefreshing(false);
  };

  const handleFieldChange = (
    setter: (v: string) => void,
    value: string,
  ) => {
    setter(value);
    setDirty(true);
  };

  const pickAvatar = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const url = await uploadAvatar(result.assets[0].uri);
      setAvatarUrl(url);
      setDirty(true);
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Could not upload avatar.",
      );
    } finally {
      setUploading(false);
    }
  };

  const header = (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {dirty && (
          <TouchableOpacity
            style={styles.headerSaveBtn}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            activeOpacity={0.7}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.headerSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.pageTitle}>Profile</Text>
    </View>
  );

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty state (no profile found) ──────────────────────────────
  if (!profile && !isLoading) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <Ionicons
            name="person-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>Profile not found</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── Profile Card ─────────────────────────────────────── */}
          <View style={styles.profileCard}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={pickAvatar}
              activeOpacity={0.7}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              ) : (
                <Avatar
                  name={fullName || profile?.full_name || null}
                  size={AVATAR_SIZE}
                  photoUrl={avatarUrl}
                />
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {fullName || "Your Name"}
              </Text>
              {(jobTitle || company) ? (
                <Text style={styles.profileRole} numberOfLines={1}>
                  {[jobTitle, company].filter(Boolean).join(" at ")}
                </Text>
              ) : null}
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
            </View>
          </View>

          {/* ── Basic Info Section ────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(v) => handleFieldChange(setFullName, v)}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Job Title</Text>
              <TextInput
                style={styles.input}
                value={jobTitle}
                onChangeText={(v) => handleFieldChange(setJobTitle, v)}
                placeholder="e.g. Software Engineer"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Company</Text>
              <TextInput
                style={styles.input}
                value={company}
                onChangeText={(v) => handleFieldChange(setCompany, v)}
                placeholder="e.g. Acme Inc."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroupLast}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={(v) => handleFieldChange(setBio, v)}
                placeholder="Tell others about yourself..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Contact Information Section ───────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Toggle visibility to control what other attendees can see.
            </Text>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={phone}
                  onChangeText={(v) => handleFieldChange(setPhone, v)}
                  placeholder="e.g. +1 (555) 123-4567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[styles.visibilityBtn, showPhone && styles.visibilityBtnActive]}
                  onPress={() => { setShowPhone(!showPhone); setDirty(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPhone ? "eye-outline" : "eye-off-outline"}
                    size={16}
                    color={showPhone ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={contactEmail}
                  onChangeText={(v) => handleFieldChange(setContactEmail, v)}
                  placeholder="e.g. you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.visibilityBtn, showEmail && styles.visibilityBtnActive]}
                  onPress={() => { setShowEmail(!showEmail); setDirty(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showEmail ? "eye-outline" : "eye-off-outline"}
                    size={16}
                    color={showEmail ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Address */}
            <View style={styles.fieldGroupLast}>
              <Text style={styles.fieldLabel}>Address</Text>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={address}
                  onChangeText={(v) => handleFieldChange(setAddress, v)}
                  placeholder="e.g. 123 Main St, City, State"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={[styles.visibilityBtn, showAddress && styles.visibilityBtnActive]}
                  onPress={() => { setShowAddress(!showAddress); setDirty(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showAddress ? "eye-outline" : "eye-off-outline"}
                    size={16}
                    color={showAddress ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Save Button ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!dirty || saveMutation.isPending) && styles.saveBtnDisabled,
            ]}
            onPress={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            activeOpacity={0.8}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} style={{ marginRight: spacing.sm }} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Sign Out Button ──────────────────────────────────── */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() =>
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: signOut },
              ])
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.error}
              style={{ marginRight: spacing.sm }}
            />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
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
  headerSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerSaveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
  },

  // Profile Card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.lg,
    ...shadows.sm,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarLoading: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.md,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  profileRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  profileEmail: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },

  // Fields
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldGroupLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
  },

  // Contact row
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  contactInput: {
    flex: 1,
  },
  visibilityBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  visibilityBtnActive: {
    borderColor: colors.primary + "50",
    backgroundColor: colors.primary + "10",
  },

  // Save button
  saveBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: colors.white,
    ...typography.button,
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error + "30",
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  signOutBtnText: {
    ...typography.button,
    color: colors.error,
  },

  // Empty
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});
