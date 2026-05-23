import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TodayAppointment from "../components/shared/todayAppointment";
import AIAssistant from "../components/ui/AIAssistant";
import Departments from "../components/ui/departments";
import Header from "../components/ui/header";
import Services from "../components/ui/services";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

const PROMOTIONAL_BANNERS = [
  {
    id: 1,
    title: "ინსტრუმენტული კვლევები",
    subtitle: "მალე შეგეძლებათ დაჯავშნოთ ვიზიტი შენთვის სასურველ კლინიკაში",
    colors: ["#20BEB8", "#0EA5E9"],
    icon: "medical",
  },
  {
    id: 2,
    title: "ონლაინ კონსულტაცია",
    subtitle: "დაჯავშნე ვიდეო კონსულტაცია და მიიღე ფასდაკლება",
    colors: ["#10B981", "#059669"],
    icon: "videocam",
  },
  {
    id: 3,
    title: "ლაბორატორიული კვლევები",
    subtitle: "მალე შესაძლებელი იქნება გამოიძახო ნებისმიერ მისამართზე ",
    colors: ["#8B5CF6", "#7C3AED"],
    icon: "flask",
  },
];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onRefresh = useCallback(() => {
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

  const handlePromoDetailsPress = (bannerId: number) => {
    if (bannerId === 1) {
      router.push({
        pathname: "/(tabs)/lab",
        params: { tab: "immunological" },
      });
      return;
    }
    if (bannerId === 3) {
      router.push({
        pathname: "/(tabs)/lab",
        params: { tab: "laboratory" },
      });
      return;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#20BEB8"
          />
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
          <AIAssistant />
          <Departments />

          <View style={styles.promoContainer}>
            <FlatList
              ref={flatListRef}
              data={PROMOTIONAL_BANNERS}
              renderItem={({ item }) => (
                <View style={styles.slideContainer}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handlePromoDetailsPress(item.id)}
                  >
                    <LinearGradient
                      colors={item.colors as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.promoCard}
                    >
                      <View style={styles.promoContent}>
                        <View style={styles.promoTextContainer}>
                          <Text style={styles.promoTitle}>{item.title}</Text>
                          <Text style={styles.promoSubtitle}>
                            {item.subtitle}
                          </Text>
                          <View style={styles.promoButton}>
                            <Text style={styles.promoButtonText}>დეტალები</Text>
                            <Ionicons
                              name="arrow-forward"
                              size={16}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>
                        <View style={styles.promoIconContainer}>
                          <Ionicons
                            name={item.icon as any}
                            size={64}
                            color="rgba(255, 255, 255, 0.3)"
                          />
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollView: {
    flex: 1,
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
    height: 170,
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
    height: "100%",
  },
  promoTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  promoTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  promoSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 12,
    lineHeight: 18,
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
    fontSize: 13,
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
