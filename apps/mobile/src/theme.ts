import { StyleSheet, Platform } from "react-native";

// ── Color Palette ──────────────────────────────────────────────
export const colors = {
  // Primary
  primary: "#8b3dff",
  primaryDark: "#7030d4",
  primaryLight: "#f3edff",
  primaryMuted: "rgba(139, 61, 255, 0.08)",
  primarySoft: "rgba(139, 61, 255, 0.15)",

  // Brand accents
  brandPink: "#ff2f92",
  brandOrange: "#ff8a3d",

  // Gradient endpoints
  gradientStart: "#8b3dff",
  gradientMid: "#ff2f92",
  gradientEnd: "#ff8a3d",

  // Neutrals
  background: "#fafafa",
  surface: "#ffffff",
  surfaceElevated: "#fafafa",
  textPrimary: "#09090b",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  border: "#e4e4e7",
  borderLight: "#f0f0f2",
  divider: "#f4f4f5",
  muted: "#f4f4f5",

  // Status
  success: "#16a34a",
  successSoft: "rgba(22, 163, 74, 0.10)",
  warning: "#f59e0b",
  warningSoft: "rgba(245, 158, 11, 0.10)",
  error: "#ef4444",
  errorSoft: "rgba(239, 68, 68, 0.10)",

  // Misc
  overlay: "rgba(0, 0, 0, 0.04)",
  white: "#ffffff",
  black: "#000000",
};

// ── Typography ─────────────────────────────────────────────────
export const typography = {
  brand: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: "500" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  captionBold: { fontSize: 13, fontWeight: "600" as const },
  small: { fontSize: 11, fontWeight: "600" as const },
  button: { fontSize: 16, fontWeight: "700" as const },
  buttonSmall: { fontSize: 14, fontWeight: "600" as const },
};

// ── Spacing ────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ── Radius ─────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// ── Shadows ────────────────────────────────────────────────────
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: "#09090b",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#09090b",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#09090b",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  }),
};

// ── Shared Component Styles ────────────────────────────────────
export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
  cardCompact: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center" as const,
  },
  buttonPrimaryText: {
    color: colors.white,
    ...typography.button,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
