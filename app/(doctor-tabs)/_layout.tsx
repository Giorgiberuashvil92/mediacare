import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FloatingAIAssistant from "../components/ui/FloatingAIAssistant";
import { tabBarLabel, tabBarScreenOptions } from "../components/ui/TabBarLabel";
import { useLanguage } from "../contexts/LanguageContext";
import { ScheduleProvider } from "../contexts/ScheduleContext";
import {
  CallOverlayState,
  getCallOverlayState,
  subscribeCallOverlayState,
} from "../utils/callOverlayStore";

export default function DoctorTabsLayout() {
  const router = useRouter();
  const { t } = useLanguage();
  const [callOverlay, setCallOverlay] = useState<CallOverlayState>(
    getCallOverlayState(),
  );

  useEffect(() => {
    return subscribeCallOverlayState(setCallOverlay);
  }, []);

  return (
    <ScheduleProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: "#20BEB8",
            tabBarInactiveTintColor: "#94A3B8",
            ...tabBarScreenOptions,
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t("doctor.tabs.home"),
              tabBarLabel: tabBarLabel(t("doctor.tabs.home")),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="appointments"
            options={{
              title: t("doctor.tabs.primaryVisits"),
              tabBarLabel: tabBarLabel(t("doctor.tabs.primaryVisits")),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="patients"
            options={{
              title: t("doctor.tabs.secondaryVisits"),
              tabBarLabel: tabBarLabel(t("doctor.tabs.secondaryVisits")),
              tabBarIcon: ({ color, size }) => (
                <FontAwesome6 name="users" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="schedule"
            options={{
              title: t("doctor.tabs.schedule"),
              tabBarLabel: tabBarLabel(t("doctor.tabs.schedule")),
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="calendar" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="ai-assistant"
            options={{
              title: t("tabs.aiAssistant"),
              tabBarLabel: tabBarLabel(t("tabs.aiAssistant")),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubbles" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t("settings.menu.profile"),
              tabBarLabel: tabBarLabel(t("settings.menu.profile")),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" size={size} color={color} />
              ),
            }}
          />
          {/* Hidden screens - accessible via navigation but not shown in tab bar */}
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
        <FloatingAIAssistant />
        {callOverlay.visible && callOverlay.appointmentId ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.callOverlayCard}
            onPress={() => router.back()}
          >
            <Ionicons name="videocam" size={18} color="#FFFFFF" />
            <Text style={styles.callOverlayTitle}>მიმდინარე ზარი</Text>
            <Text style={styles.callOverlayName} numberOfLines={1}>
              {callOverlay.remoteUserName || "დაბრუნება ზარზე"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScheduleProvider>
  );
}

const styles = StyleSheet.create({
  callOverlayCard: {
    position: "absolute",
    right: 12,
    top: 70,
    width: 152,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "rgba(17, 24, 39, 0.96)",
    borderWidth: 1,
    borderColor: "#374151",
    gap: 4,
  },
  callOverlayTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  callOverlayName: {
    color: "#D1D5DB",
    fontSize: 10,
    fontFamily: "Poppins-Medium",
  },
});
