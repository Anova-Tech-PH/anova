import { Drawer } from "expo-router/drawer";
import { LinearGradient } from "expo-linear-gradient";
import { CustomDrawerContent } from "../../src/components/custom-drawer-content";
import { SidebarDataProvider } from "../../src/lib/sidebar-data-context";
import { colors } from "../../src/theme";

const HIDDEN = { drawerItemStyle: { display: "none" as const } };

export default function AppLayout() {
  return (
    <SidebarDataProvider>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerBackground: () => (
            <LinearGradient
              colors={["#6a2cc0", "#c4206e", "#d06a28"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          ),
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "700" },
          drawerStyle: { width: 280 },
        }}
      >
        {/* Primary screens */}
        <Drawer.Screen name="home/index" options={{ title: "Home", headerShown: false }} />
        <Drawer.Screen name="schedule/index" options={{ title: "Schedule" }} />
        <Drawer.Screen name="speakers/index" options={{ title: "Speakers" }} />
        <Drawer.Screen name="attendees/index" options={{ title: "Attendees" }} />
        <Drawer.Screen name="community/index" options={{ title: "Community" }} />
        <Drawer.Screen name="photos/index" options={{ title: "Photos" }} />
        <Drawer.Screen name="sponsors/index" options={{ title: "Sponsors" }} />
        <Drawer.Screen name="announcements/index" options={{ title: "Announcements" }} />
        <Drawer.Screen name="volunteer/index" options={{ title: "Volunteer" }} />
        <Drawer.Screen name="leaderboard/index" options={{ title: "Leaderboard" }} />
        <Drawer.Screen name="contests/index" options={{ title: "Contests" }} />
        <Drawer.Screen name="trivia/index" options={{ title: "Trivia" }} />
        <Drawer.Screen name="passport/index" options={{ title: "Passport" }} />
        <Drawer.Screen name="qa/index" options={{ title: "Session Q&A" }} />
        <Drawer.Screen name="resources/index" options={{ title: "Documents" }} />
        <Drawer.Screen name="logistics/index" options={{ title: "Logistics" }} />
        <Drawer.Screen name="rooms/index" options={{ title: "Rooms" }} />
        <Drawer.Screen name="floormap/index" options={{ title: "Floormap" }} />
        <Drawer.Screen name="feedback/index" options={{ title: "Feedback" }} />
        <Drawer.Screen name="my-agenda/index" options={{ title: "My Agenda" }} />
        <Drawer.Screen name="my-notes/index" options={{ title: "My Notes" }} />
        <Drawer.Screen name="messages/index" options={{ title: "Messages" }} />
        <Drawer.Screen name="profile/index" options={{ title: "Profile" }} />
        <Drawer.Screen name="certificate/index" options={{ title: "Certificate" }} />
        <Drawer.Screen name="my-events/index" options={{ title: "My Events" }} />
        <Drawer.Screen name="stream/index" options={{ title: "Live Stream", ...HIDDEN }} />
        <Drawer.Screen name="checkin/index" options={{ title: "Check-in", ...HIDDEN }} />

        {/* Detail screens - hidden from drawer */}
        <Drawer.Screen name="schedule/[sessionId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="speakers/[speakerId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="attendees/[userId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="community/[topicId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="sponsors/[sponsorId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="contests/[contestId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="trivia/[gameId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="qa/[sessionId]" options={{ ...HIDDEN }} />
        <Drawer.Screen name="messages/[conversationId]" options={{ ...HIDDEN }} />
      </Drawer>
    </SidebarDataProvider>
  );
}
