import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { getEventDocuments } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function getFileIcon(fileType?: string | null): keyof typeof Ionicons.glyphMap {
  if (!fileType) return "document-text-outline";
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return "document-outline";
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg"))
    return "image-outline";
  if (t.includes("video") || t.includes("mp4")) return "videocam-outline";
  if (t.includes("spreadsheet") || t.includes("xls") || t.includes("csv"))
    return "grid-outline";
  if (t.includes("presentation") || t.includes("ppt")) return "easel-outline";
  if (t.includes("link") || t.includes("url")) return "link-outline";
  return "document-text-outline";
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsScreen() {
  const navigation = useNavigation();
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", currentEvent?.id],
    queryFn: () => getEventDocuments(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    setRefreshing(false);
  }, [queryClient]);

  const renderDocument = ({ item }: { item: any }) => {
    const icon = getFileIcon(item.file_type);
    const sizeStr = formatFileSize(item.file_size);

    return (
      <TouchableOpacity
        style={styles.docCard}
        onPress={() => {
          if (item.file_url) Linking.openURL(item.file_url);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.docMeta}>
            {item.file_type && (
              <Text style={styles.docType}>
                {item.file_type.toUpperCase()}
              </Text>
            )}
            {sizeStr ? <Text style={styles.docSize}>{sizeStr}</Text> : null}
          </View>
        </View>
        <Ionicons name="download-outline" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (!currentEvent) {
      return (
        <View style={shared.centered}>
          <EmptyState
            icon="calendar-outline"
            title="Select an event"
            subtitle="Go to My Events to choose an event"
          />
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={shared.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <FlatList
        data={documents ?? []}
        keyExtractor={(item: any) => item.id}
        renderItem={renderDocument}
        contentContainerStyle={shared.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No documents"
            subtitle="Event documents and resources will appear here"
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {/* Custom Header */}
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
        <Text style={styles.pageTitle}>Resources</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  docMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  docType: {
    ...typography.small,
    color: colors.textMuted,
  },
  docSize: {
    ...typography.small,
    color: colors.textMuted,
  },
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
});
