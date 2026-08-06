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
} from "../../src/theme";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        {/* Gradient Hero with decorative elements */}
        <LinearGradient
          colors={["#0a6365", "#0d7377", "#0a9396", "#14b8a6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Floating decorative circles */}
          <View style={styles.decoContainer}>
            <View style={[styles.decoCircle, styles.decoCircle1]} />
            <View style={[styles.decoCircle, styles.decoCircle2]} />
            <View style={[styles.decoCircle, styles.decoCircle3]} />
            <View style={[styles.decoDot, styles.decoDot1]} />
            <View style={[styles.decoDot, styles.decoDot2]} />
            <View style={[styles.decoDot, styles.decoDot3]} />
          </View>

          {/* Icon badge */}
          <View style={styles.iconBadge}>
            <Ionicons name="calendar" size={32} color={colors.white} />
          </View>

          <Text style={styles.brand}>Evenstry</Text>
          <Text style={styles.heroSubtitle}>
            Your next great event awaits
          </Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>
            Sign in to continue to your events
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View
              style={[
                styles.inputRow,
                focusedField === "email" && styles.inputRowFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={
                  focusedField === "email"
                    ? colors.primary
                    : colors.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
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
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.inputRow,
                focusedField === "password" && styles.inputRowFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={
                  focusedField === "password"
                    ? colors.primary
                    : colors.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
            style={{ marginTop: spacing.xxl }}
          >
            <LinearGradient
              colors={["#0d7377", "#0a9396"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={colors.white}
                    style={{ marginLeft: spacing.sm }}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
              <Ionicons name="logo-apple" size={20} color={colors.black} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>

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
    backgroundColor: "#0a6365",
  },
  scrollContent: {
    flexGrow: 1,
  },
  // -- Hero ---------------------------------------------------
  hero: {
    paddingTop: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: 70,
    alignItems: "center",
    overflow: "hidden",
  },
  decoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  decoCircle: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  decoCircle1: {
    width: 180,
    height: 180,
    top: -40,
    right: -50,
  },
  decoCircle2: {
    width: 120,
    height: 120,
    bottom: -20,
    left: -30,
  },
  decoCircle3: {
    width: 80,
    height: 80,
    top: 30,
    left: 40,
    borderColor: "rgba(255,255,255,0.08)",
  },
  decoDot: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  decoDot1: {
    width: 8,
    height: 8,
    top: 50,
    right: 60,
  },
  decoDot2: {
    width: 12,
    height: 12,
    bottom: 40,
    right: 40,
  },
  decoDot3: {
    width: 6,
    height: 6,
    top: 90,
    left: 80,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  brand: {
    ...typography.brand,
    fontSize: 36,
    color: colors.white,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -1,
  },
  heroSubtitle: {
    ...typography.body,
    color: "rgba(255,255,255,0.80)",
    textAlign: "center",
    fontSize: 14,
  },
  // -- Form Card -----------------------------------------------
  formCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
  },
  formTitle: {
    ...typography.h1,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl + 4,
    fontSize: 14,
  },
  // -- Inputs --------------------------------------------------
  inputGroup: {
    marginBottom: spacing.lg + 2,
  },
  inputLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  forgotLink: {
    ...typography.caption,
    color: colors.primary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8faf5",
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
  },
  inputRowFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.textPrimary,
  },
  // -- Button --------------------------------------------------
  button: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0d7377",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 17,
  },
  // -- Divider -------------------------------------------------
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xxl + 4,
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    fontSize: 12,
  },
  // -- Social --------------------------------------------------
  socialRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  socialButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
  },
  // -- Footer --------------------------------------------------
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xxl + 4,
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
