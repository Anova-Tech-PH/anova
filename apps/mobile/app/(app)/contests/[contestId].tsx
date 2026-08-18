import React from "react";
import { TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "../../../src/components/empty-state";
import { colors, shared } from "../../../src/theme";

export default function ContestDetailScreen() {
  const { contestId } = useLocalSearchParams<{ contestId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  React.useEffect(() => {
    navigation.setOptions({
      title: "Contest",
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
        icon="camera-outline"
        title="Contest details coming soon"
        subtitle="Contest entries, voting, and results will appear here once this feature is available"
      />
    </SafeAreaView>
  );
}
