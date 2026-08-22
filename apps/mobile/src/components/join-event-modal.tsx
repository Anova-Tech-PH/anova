import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lookupEventByJoinCode, registerByJoinCode } from "@attendly/supabase-client";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { useEventContext } from "../lib/event-context";
import { colors, typography, spacing, radius, shadows } from "../theme";

interface JoinEventModalProps {
  visible: boolean;
  onClose: () => void;
  initialCode?: string;
}

export function JoinEventModal({ visible, onClose, initialCode = "" }: JoinEventModalProps) {
  const { user } = useAuth();
  const { setCurrentEvent } = useEventContext();
  const queryClient = useQueryClient();
  const [code, setCode] = useState(initialCode);
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [eventData, setEventData] = useState<any>(null);

  const lookupMutation = useMutation({
    mutationFn: () => lookupEventByJoinCode(supabase, code),
    onSuccess: (data) => {
      if (!data) {
        Alert.alert("Not Found", "No event found with that code. Please check and try again.");
        return;
      }
      setEventData(data);
      setStep("confirm");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!eventData || !user) throw new Error("Missing data");
      const freeTicket = eventData.ticket_types?.find((t: any) => t.type === "free");
      if (!freeTicket) throw new Error("No free tickets available for this event");
      return registerByJoinCode(supabase, {
        eventId: eventData.id,
        ticketTypeId: freeTicket.id,
        userId: user.id,
        name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Attendee",
        email: user.email!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-events", user?.id] });
      setCurrentEvent(eventData);
      Alert.alert("Joined!", `You've joined ${eventData.title}.`);
      handleClose();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleClose = () => {
    setCode("");
    setStep("enter");
    setEventData(null);
    onClose();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === "enter" ? "Join an Event" : "Confirm"}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {step === "enter" ? (
            <>
              <Text style={styles.description}>
                Enter the event code provided by the organizer.
              </Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="e.g. ABC123"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                returnKeyType="go"
                onSubmitEditing={() => code.length >= 4 && lookupMutation.mutate()}
              />
              <TouchableOpacity
                style={[styles.button, code.length < 4 && styles.buttonDisabled]}
                disabled={code.length < 4 || lookupMutation.isPending}
                onPress={() => lookupMutation.mutate()}
                activeOpacity={0.7}
              >
                {lookupMutation.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Find Event</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.eventCard}>
                <Text style={styles.eventTitle}>{eventData?.title}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>{formatDate(eventData?.start_date)}</Text>
                </View>
                {eventData?.venue_name && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>{eventData.venue_name}</Text>
                  </View>
                )}
                {eventData?.organizations?.name && (
                  <View style={styles.metaRow}>
                    <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>by {eventData.organizations.name}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.button}
                disabled={joinMutation.isPending}
                onPress={() => joinMutation.mutate()}
                activeOpacity={0.7}
              >
                {joinMutation.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Join Event</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep("enter")}
              >
                <Text style={styles.backButtonText}>Use a different code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    ...typography.h2,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  eventCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  eventTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  backButton: {
    alignItems: "center",
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  backButtonText: {
    ...typography.captionBold,
    color: colors.primary,
  },
});
