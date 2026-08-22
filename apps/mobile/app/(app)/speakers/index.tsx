import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { getSpeakersWithSessions } from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useEventContext } from "../../../src/lib/event-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, spacing, radius, shadows, shared } from "../../../src/theme";

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function SpeakersScreen() {
  const { currentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const { data: speakers = [], isLoading } = useQuery({
    queryKey: ["speakers-with-sessions", currentEvent?.id],
    queryFn: () => getSpeakersWithSessions(supabase, currentEvent!.id),
    enabled: !!currentEvent?.id,
  });

  // Extract unique days from all sessions
  const days = useMemo(() => {
    const daySet = new Set<string>();
    (speakers as any[]).forEach((s: any) => {
      (s.session_speakers ?? []).forEach((ss: any) => {
        const session = ss.sessions;
        if (session?.start_time) {
          daySet.add(session.start_time.split("T")[0]);
        }
      });
    });
    return Array.from(daySet).sort();
  }, [speakers]);

  // Extract unique categories (tracks)
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    (speakers as any[]).forEach((s: any) => {
      (s.session_speakers ?? []).forEach((ss: any) => {
        const session = ss.sessions;
        if (!session) return;
        (session.session_tracks ?? []).forEach((st: any) => {
          if (st.tracks?.name) catSet.add(st.tracks.name);
        });
      });
    });
    return Array.from(catSet).sort();
  }, [speakers]);

  const filtered = useMemo(() => {
    let result = speakers as any[];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q) ||
          s.company?.toLowerCase().includes(q)
      );
    }

    if (selectedDay) {
      result = result.filter((s: any) =>
        (s.session_speakers ?? []).some(
          (ss: any) => ss.sessions?.start_time?.split("T")[0] === selectedDay
        )
      );
    }

    if (selectedCategory) {
      result = result.filter((s: any) =>
        (s.session_speakers ?? []).some((ss: any) =>
          (ss.sessions?.session_tracks ?? []).some(
            (st: any) => st.tracks?.name === selectedCategory
          )
        )
      );
    }

    return result;
  }, [speakers, search, selectedDay, selectedCategory]);

  const resetFilters = () => {
    setSearch("");
    setSelectedDay("");
    setSelectedCategory("");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["speakers-with-sessions"] });
    setRefreshing(false);
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
      </View>
      <Text style={styles.pageTitle}>Speakers</Text>
    </View>
  );

  if (!currentEvent) {
    return (
      <SafeAreaView style={shared.screen} edges={["bottom"]}>
        {header}
        <View style={shared.centered}>
          <EmptyState icon="mic-outline" title="Select an event" subtitle="Go to My Events to choose an event" />
        </View>
      </SafeAreaView>
    );
  }

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

  const renderSpeaker = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.speakerCard}
      onPress={() => router.push(`/(app)/speakers/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <Avatar name={item.name} size={56} uri={item.photo} />
      <View style={styles.speakerInfo}>
        <Text style={styles.speakerName} numberOfLines={1}>{item.name}</Text>
        {item.title && (
          <Text style={styles.speakerTitle} numberOfLines={1}>{item.title}</Text>
        )}
        {item.company && (
          <Text style={styles.speakerCompany} numberOfLines={1}>{item.company}</Text>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Speaker</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={shared.screen} edges={["bottom"]}>
      {header}
      <Text style={[styles.pageSubtitle, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
        {speakers.length} speaker{speakers.length !== 1 ? "s" : ""} at {currentEvent.title}
      </Text>

      {/* Filters */}
      <View style={styles.filtersSection}>
        {/* Row 1: Day + Category dropdowns */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.selectBtn, { flex: 1 }]}
            onPress={() => setDayPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectText, !selectedDay && { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedDay ? formatDay(selectedDay) : "All days"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectBtn, { flex: 1 }]}
            onPress={() => setCategoryPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectText, !selectedCategory && { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedCategory || "All categories"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Reset + Search */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={resetFilters}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.textPrimary} />
            <Text style={styles.resetText}>Reset filters</Text>
          </TouchableOpacity>

          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={14} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, title..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      </View>

      {/* Speaker List */}
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderSpeaker}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="mic-outline"
            title="No speakers found"
            subtitle={search || selectedDay || selectedCategory ? "Try adjusting your filters" : undefined}
          />
        }
      />

      {/* Day Picker Modal */}
      <Modal visible={dayPickerOpen} transparent animationType="fade" onRequestClose={() => setDayPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDayPickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Day</Text>
            <TouchableOpacity
              style={[styles.modalOption, !selectedDay && styles.modalOptionActive]}
              onPress={() => { setSelectedDay(""); setDayPickerOpen(false); }}
            >
              <Text style={[styles.modalOptionLabel, !selectedDay && styles.modalOptionLabelActive]}>All days</Text>
              {!selectedDay && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
            {days.map((day) => {
              const isSelected = day === selectedDay;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => { setSelectedDay(day); setDayPickerOpen(false); }}
                >
                  <Text style={[styles.modalOptionLabel, isSelected && styles.modalOptionLabelActive]}>
                    {formatDay(day)}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryPickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              style={[styles.modalOption, !selectedCategory && styles.modalOptionActive]}
              onPress={() => { setSelectedCategory(""); setCategoryPickerOpen(false); }}
            >
              <Text style={[styles.modalOptionLabel, !selectedCategory && styles.modalOptionLabelActive]}>All categories</Text>
              {!selectedCategory && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
            {categories.map((cat) => {
              const isSelected = cat === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => { setSelectedCategory(cat); setCategoryPickerOpen(false); }}
                >
                  <Text style={[styles.modalOptionLabel, isSelected && styles.modalOptionLabelActive]}>{cat}</Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  filtersSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filtersRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  selectText: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 4,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  resetText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  speakerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  speakerInfo: {
    flex: 1,
    minWidth: 0,
  },
  speakerName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  speakerTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  speakerCompany: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3b82f6",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 320,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  modalOptionActive: {
    backgroundColor: `${colors.primary}10`,
  },
  modalOptionLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  modalOptionLabelActive: {
    color: colors.primary,
  },
});
