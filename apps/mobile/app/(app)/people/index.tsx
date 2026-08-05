import { View, Text, StyleSheet } from "react-native";

export default function PeopleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>People</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8faf5",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#1a2e05" },
  subtitle: { fontSize: 16, color: "#6b7280", marginTop: 8 },
});
