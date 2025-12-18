import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { ScheduleProvider } from "../contexts/ScheduleContext";

export default function DoctorTabsLayout() {
  return (
    <ScheduleProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#20BEB8",
          tabBarInactiveTintColor: "#94A3B8",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E5EA",
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "დეშბორდი",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            title: "ჯავშნები",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="patients"
          options={{
            title: "პაციენტები",
            tabBarIcon: ({ color, size }) => (
              <FontAwesome6 name="users" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: "გრაფიკი",
            tabBarIcon: ({ color, size }) => (
              <AntDesign name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "პროფილი",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden screens - accessible via navigation but not shown in tab bar */}
        <Tabs.Screen
          name="chat"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="active-patients"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="laboratory"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ScheduleProvider>
  );
}
