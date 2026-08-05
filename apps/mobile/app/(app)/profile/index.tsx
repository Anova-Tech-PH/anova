import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../../../src/lib/auth-context";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>{user?.email ?? "No email"}</Text>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
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
  signOutButton: {
    marginTop: 32,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
