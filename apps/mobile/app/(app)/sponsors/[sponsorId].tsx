import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getSponsorDetail } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { EmptyState } from "../../../src/components/empty-state";
import { Badge } from "../../../src/components/badge";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

export default function SponsorDetailScreen() {
  const { sponsorId } = useLocalSearchParams<{ sponsorId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: sponsor, isLoading } = useQuery({
    queryKey: ["sponsor-detail", sponsorId],
    queryFn: () => getSponsorDetail(supabase, sponsorId!),
    enabled: !!sponsorId,
  });

  React.useEffect(() => {
    const name = (sponsor as any)?.name;
    navigation.setOptions({
      title: name ?? "Sponsor",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [sponsor, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sponsor-detail", sponsorId] });
    setRefreshing(false);
  }, [queryClient, sponsorId]);

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!sponsor) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <EmptyState
          icon="ribbon-outline"
          title="Sponsor not found"
          subtitle="This sponsor may no longer be available"
        />
      </SafeAreaView>
    );
  }

  const documents = sponsor.documents ?? [];
  const coupons = sponsor.coupons ?? [];

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Logo & Name */}
        <View style={styles.header}>
          {sponsor.logo_url ? (
            <Image
              source={{ uri: sponsor.logo_url }}
              style={styles.logo}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Ionicons name="business-outline" size={48} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.name}>{sponsor.name}</Text>
          {sponsor.tier && (
            <Badge
              label={(sponsor.tier as any).name}
              color={colors.primary}
              backgroundColor={colors.primaryLight}
            />
          )}
        </View>

        {/* Description */}
        {sponsor.description && (
          <View style={styles.section}>
            <Text style={styles.description}>{sponsor.description}</Text>
          </View>
        )}

        {/* Website */}
        {sponsor.website_url && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL(sponsor.website_url)}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text style={styles.linkText}>Visit Website</Text>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Promo Content */}
        {sponsor.promo_content && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Promotion</Text>
            <View style={styles.promoCard}>
              <Text style={styles.promoText}>{sponsor.promo_content}</Text>
            </View>
          </View>
        )}

        {/* Coupons */}
        {coupons.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coupons</Text>
            {coupons.map((coupon: any) => (
              <View key={coupon.id} style={styles.couponCard}>
                <View style={styles.couponBadge}>
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.couponInfo}>
                  <Text style={styles.couponCode}>{coupon.code}</Text>
                  {coupon.description && (
                    <Text style={styles.couponDescription}>{coupon.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>
            {documents.map((doc: any) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onPress={() => {
                  if (doc.file_url) Linking.openURL(doc.file_url);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={styles.docTitle} numberOfLines={1}>
                  {doc.title}
                </Text>
                <Ionicons name="download-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.borderLight,
  },
  logoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.primary,
    flex: 1,
  },
  promoCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  promoText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  couponBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  couponInfo: {
    flex: 1,
  },
  couponCode: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  couponDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  docTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
});
