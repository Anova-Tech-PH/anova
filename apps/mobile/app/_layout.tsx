import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../src/lib/auth-context";
import { EventProvider } from "../src/lib/event-context";
import {
  registerForPushNotifications,
  addNotificationListeners,
} from "../src/lib/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

function AuthGuard() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in, redirect to sign-in
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      // Signed in but still on auth screen, redirect to app
      router.replace("/(app)/home");
    }
  }, [session, isLoading, segments]);

  // Push notifications: register token and set up listeners when authenticated
  useEffect(() => {
    if (!session?.user) return;

    registerForPushNotifications(session.user.id).catch((err) =>
      console.warn("Failed to register for push notifications:", err)
    );

    const cleanup = addNotificationListeners(
      undefined, // onReceived — default handler shows the alert
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === "connection") {
          router.replace("/(app)/attendees");
        }
      }
    );

    return cleanup;
  }, [session?.user?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8b3dff" />
      </View>
    );
  }

  return (
    <EventProvider>
      <Slot />
    </EventProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </QueryClientProvider>
  );
}
