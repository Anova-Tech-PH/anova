import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { JoinEventModal } from "../../src/components/join-event-modal";
import { useAuth } from "../../src/lib/auth-context";
import { colors, shared } from "../../src/theme";

export default function JoinByCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user && code) {
      setShowModal(true);
    }
  }, [user, code]);

  const handleClose = () => {
    setShowModal(false);
    router.replace("/(app)/home");
  };

  if (!user) {
    return (
      <SafeAreaView style={shared.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <JoinEventModal
        visible={showModal}
        onClose={handleClose}
        initialCode={code ?? ""}
      />
    </View>
  );
}
