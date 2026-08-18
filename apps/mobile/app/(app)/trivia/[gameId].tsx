import React from "react";
import { TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, shared } from "../../../src/theme";

export default function TriviaGameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  React.useEffect(() => {
    navigation.setOptions({
      title: "Trivia",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={shared.centered} edges={["bottom"]}>
      <EmptyState
        icon="bulb-outline"
        title="Trivia game coming soon"
        subtitle="Real-time trivia gameplay with live scoring will be available here once this feature launches"
      />
    </SafeAreaView>
  );
}
