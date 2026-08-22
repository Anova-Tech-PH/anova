import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getMessages,
  sendMessageMutation,
  subscribeToMessages,
  unsubscribeFromMessages,
  markConversationReadMutation,
} from "@attendly/supabase-client";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/lib/auth-context";
import { Avatar } from "../../../src/components/avatar";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, typography, spacing, radius, shadows, shared } from "../../../src/theme";

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(supabase, conversationId!),
    enabled: !!conversationId,
  });

  // Derive the other person's name from messages
  const otherPerson = messages.find((m: any) => m.sender_id !== user?.id);
  const otherName = otherPerson?.profiles?.full_name ?? "Messages";

  // Mark conversation as read on mount
  useEffect(() => {
    if (conversationId && user?.id) {
      markConversationReadMutation(supabase, conversationId, user.id);
    }
  }, [conversationId, user?.id]);

  // Subscribe to new messages via realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = subscribeToMessages(supabase, conversationId, (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Mark as read when receiving new messages in this view
      if (user?.id) {
        markConversationReadMutation(supabase, conversationId, user.id);
      }
    });

    return () => {
      unsubscribeFromMessages(supabase, channel);
    };
  }, [conversationId, user?.id, queryClient]);

  const sendMutation = useMutation({
    mutationFn: () =>
      sendMessageMutation(supabase, user!.id, {
        conversation_id: conversationId!,
        content: messageText.trim(),
      }),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={shared.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Reverse messages for inverted FlatList (newest at bottom)
  const reversedMessages = [...messages].reverse();

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === user?.id;
    const senderProfile = item.profiles;

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowOther,
        ]}
      >
        {!isMine && (
          <Avatar
            name={senderProfile?.full_name}
            size={28}
            uri={senderProfile?.avatar_url}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
          ]}
        >
          {!isMine && senderProfile?.full_name && (
            <Text style={styles.senderName}>{senderProfile.full_name}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isMine ? styles.messageTextMine : styles.messageTextOther,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMine ? styles.messageTimeMine : styles.messageTimeOther,
            ]}
          >
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={shared.screen} edges={["top", "bottom"]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.navigate("/(app)/messages" as any)}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        {otherPerson?.profiles && (
          <Avatar
            name={otherPerson.profiles.full_name}
            size={32}
            uri={otherPerson.profiles.avatar_url}
          />
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {otherName}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          keyExtractor={(item: any) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <EmptyState
                icon="chatbubble-outline"
                title="No messages yet"
                subtitle="Send a message to start the conversation"
              />
            </View>
          }
        />

        {/* Compose bar */}
        {user && (
          <View style={styles.composeBar}>
            <TextInput
              style={styles.composeInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sendMutation.isPending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={() => sendMutation.mutate()}
              disabled={!messageText.trim() || sendMutation.isPending}
              activeOpacity={0.7}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  messageText.trim() && !sendMutation.isPending
                    ? colors.white
                    : colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  messagesList: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  emptyContainer: {
    // Inverted list requires flipping the empty state
    transform: [{ scaleY: -1 }],
    flex: 1,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    gap: spacing.sm,
    maxWidth: "85%",
  },
  messageRowMine: {
    alignSelf: "flex-end",
  },
  messageRowOther: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: radius.lg,
    padding: spacing.md,
    maxWidth: "100%",
  },
  messageBubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  messageBubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  senderName: {
    ...typography.small,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
  },
  messageTextMine: {
    color: colors.white,
  },
  messageTextOther: {
    color: colors.textPrimary,
  },
  messageTime: {
    ...typography.small,
    marginTop: spacing.xs,
    alignSelf: "flex-end",
  },
  messageTimeMine: {
    color: "rgba(255,255,255,0.7)",
  },
  messageTimeOther: {
    color: colors.textMuted,
  },
  composeBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  composeInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});
