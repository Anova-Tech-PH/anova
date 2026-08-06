import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth-context";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from "../../src/theme";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      Alert.alert("Sign In Failed", error.message ?? "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Gradient Hero */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.brand}>Evenstry</Text>
          <Text style={styles.heroSubtitle}>
            Welcome back. Your next great event awaits.
          </Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>
            Enter your credentials to continue
          </Text>

          {/* Email Input */}
          <View
            style={[
              styles.inputRow,
              focusedField === "email" && styles.inputRowFocused,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={
                focusedField === "email"
                  ? colors.primary
                  : colors.textMuted
              }
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password Input */}
          <View
            style={[
              styles.inputRow,
              focusedField === "password" && styles.inputRowFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={
                focusedField === "password"
                  ? colors.primary
                  : colors.textMuted
              }
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
            style={{ marginTop: spacing.lg }}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gradientStart,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // ── Hero ──────────────────────────────────────────────
  hero: {
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingBottom: 60,
    paddingHorizontal: spacing.xxxl,
    alignItems: "center",
  },
  brand: {
    ...typography.brand,
    fontSize: 38,
    color: colors.white,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
  // ── Form Card ─────────────────────────────────────────
  formCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl + 8,
    borderTopRightRadius: radius.xl + 8,
    marginTop: -24,
    paddingHorizontal: spacing.xxl + 4,
    paddingTop: spacing.xxxl + 8,
    paddingBottom: spacing.xxxl,
    ...shadows.md,
  },
  formTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
  },
  // ── Input Row ─────────────────────────────────────────
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  inputRowFocused: {
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primarySoft,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.textPrimary,
  },
  // ── Button ────────────────────────────────────────────
  button: {
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  // ── Footer ────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xxl,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  link: {
    ...typography.captionBold,
    color: colors.primary,
  },
});
