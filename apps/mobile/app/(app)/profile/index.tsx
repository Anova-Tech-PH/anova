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
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getProfile, updateProfileMutation } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
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

const AVATAR_SIZE = 100;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(supabase, user!.id),
    enabled: !!user?.id,
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfileMutation(supabase, user!.id, {
        full_name: fullName.trim(),
        avatar_url: avatarUrl ?? undefined,
        bio: bio.trim(),
        company: company.trim(),
        job_title: jobTitle.trim(),
      }),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      Alert.alert("Saved", "Your profile has been updated.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
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

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // ── Empty state (no profile found) ──────────────────────────────
  if (!profile && !isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <Ionicons
          name="person-outline"
          size={48}
          color={colors.textMuted}
        />
        <Text style={styles.emptyText}>Profile not found</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
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
          {/* ── Avatar Section ─────────────────────────────────── */}
          <View style={styles.avatarSection}>
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
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* ── Email (read-only) ──────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.inputDisabledText}>
                {user?.email ?? ""}
              </Text>
            </View>
          </View>

          {/* ── Display Name ───────────────────────────────────── */}
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

          {/* ── Job Title ──────────────────────────────────────── */}
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

          {/* ── Company ────────────────────────────────────────── */}
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

          {/* ── Bio ────────────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
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

          {/* ── Save Button ────────────────────────────────────── */}
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
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {/* ── Sign Out Button ────────────────────────────────── */}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 48,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.md,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Fields
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
  },
  inputDisabledText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },

  // Save button
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.5,
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
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: 14,
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
