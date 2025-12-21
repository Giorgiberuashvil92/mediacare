import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TodayAppointment from "../components/shared/todayAppointment";
import Departments from "../components/ui/departments";
import Header from "../components/ui/header";
import Services from "../components/ui/services";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

const PROMOTIONAL_BANNERS = [
  {
    id: 1,
    title: "სპეციალური შეთავაზება",
    subtitle: "მიიღეთ 15% ფასდაკლება პირველ ვიზიტზე",
    colors: ["#20BEB8", "#0EA5E9"],
    icon: "medical",
  },
  {
    id: 2,
    title: "ლაბორატორიული კვლევები",
    subtitle: "სპეციალური ფასები ყველა ანალიზზე",
    colors: ["#8B5CF6", "#7C3AED"],
    icon: "flask",
  },
  {
    id: 3,
    title: "ონლაინ კონსულტაცია",
    subtitle: "დაჯავშნე ვიდეო კონსულტაცია და მიიღე ფასდაკლება",
    colors: ["#10B981", "#059669"],
    icon: "videocam",
  },
];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onRefresh = useCallback(() => {
    // Future: add real data reload (appointments, doctors, etc.)
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentSlideIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

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
        
        {/* Promotional Banner Slider */}
        <View style={styles.promoContainer}>
          <FlatList
            ref={flatListRef}
            data={PROMOTIONAL_BANNERS}
            renderItem={({ item }) => (
              <View style={styles.slideContainer}>
                <LinearGradient
                  colors={item.colors as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.promoCard}
                >
                  <View style={styles.promoContent}>
                    <View style={styles.promoTextContainer}>
                      <Text style={styles.promoTitle}>{item.title}</Text>
                      <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
                      <TouchableOpacity style={styles.promoButton}>
                        <Text style={styles.promoButtonText}>დეტალები</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.promoIconContainer}>
                      <Ionicons name={item.icon as any} size={64} color="rgba(255, 255, 255, 0.3)" />
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            snapToInterval={SLIDER_WIDTH + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.sliderContent}
          />
          
          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {PROMOTIONAL_BANNERS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentSlideIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>
        
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
  promoContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  sliderContent: {
    paddingHorizontal: 16,
  },
  slideContainer: {
    width: SLIDER_WIDTH,
    marginRight: 16,
  },
  promoCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#20BEB8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: "#20BEB8",
  },
  promoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    minHeight: 140,
  },
  promoTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  promoTitle: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  promoSubtitle: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 16,
    lineHeight: 22,
  },
  promoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: "flex-start",
    gap: 6,
  },
  promoButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  promoIconContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});
