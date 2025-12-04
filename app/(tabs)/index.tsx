import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Banner from "../components/shared/banner";
import TodayAppointment from "../components/shared/todayAppointment";
import Departments from "../components/ui/departments";
import Header from "../components/ui/header";
import Services from "../components/ui/services";

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    // Future: add real data reload (appointments, doctors, etc.)
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#20BEB8" />
      }
    >
      <SafeAreaView>
        <Header />
        {refreshing && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#20BEB8" />
          </View>
        )}
        <TodayAppointment />
        <Services />
        <Departments />
        <Banner />
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loaderContainer: {
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
