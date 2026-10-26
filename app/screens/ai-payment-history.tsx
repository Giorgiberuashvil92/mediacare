import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Defs,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import { useLanguage } from "../contexts/LanguageContext";
import { apiService } from "../_services/api";

const SCREEN_BG = "#F2F2F7";

type PaymentStatus = "successful" | "unsuccessful";
type PaymentFilter = "all" | PaymentStatus;

function AISparkleLogo() {
  return (
    <Svg width={34} height={34} viewBox="0 0 48 48" fill="none">
      <Rect width={48} height={48} rx={24} fill="#7C3AED" />
      <Path
        d="M21.6199 21.1598L22.6536 17.5443C23.0409 16.1909 24.9589 16.1909 25.3463 17.5443L26.3788 21.1598C26.4442 21.3885 26.5667 21.5968 26.7349 21.765C26.9031 21.9332 27.1114 22.0557 27.3401 22.1211L30.9556 23.1536C32.3089 23.5409 32.3089 25.4589 30.9556 25.8463L27.3401 26.8788C27.1114 26.9441 26.9031 27.0667 26.7349 27.2349C26.5667 27.4031 26.4442 27.6114 26.3788 27.8401L25.3463 31.4556C24.9589 32.8089 23.0409 32.8089 22.6536 31.4556L21.6211 27.8401C21.5557 27.6114 21.4332 27.4031 21.265 27.2349C21.0968 27.0667 20.8885 26.9441 20.6598 26.8788L17.0443 25.8463C15.6909 25.4589 15.6909 23.5409 17.0443 23.1536L20.6598 22.1211C20.8885 22.0557 21.0968 21.9332 21.265 21.765C21.4332 21.5968 21.5557 21.3885 21.6211 21.1598M31.1213 29.7581C31.4584 28.7746 32.8759 28.7734 33.2119 29.7581L33.2423 29.8596L33.5876 31.2456L34.9736 31.5921C36.0936 31.8721 36.0936 33.4611 34.9736 33.7411L33.5876 34.0876L33.2423 35.4736C32.9623 36.5924 31.3721 36.5924 31.0921 35.4736L30.7456 34.0876L29.3596 33.7411C28.2396 33.4611 28.2396 31.8709 29.3596 31.5921L30.7456 31.2456L31.0921 29.8596L31.1213 29.7581ZM14.7879 13.4236C15.1356 12.4074 16.6371 12.4413 16.9089 13.5251L17.2543 14.9111L18.6403 15.2576C19.7603 15.5376 19.7603 17.1266 18.6403 17.4066L17.2543 17.7531L16.9089 19.1391C16.6289 20.2579 15.0388 20.2579 14.7588 19.1391L14.4123 17.7531L13.0263 17.4066C11.9063 17.1266 11.9063 15.5364 13.0263 15.2576L14.4123 14.9111L14.7588 13.5251L14.7879 13.4236Z"
        fill="url(#ai_payment_logo_gradient)"
      />
      <Defs>
        <SvgLinearGradient
          id="ai_payment_logo_gradient"
          x1={21.7808}
          y1={15.9675}
          x2={32.6991}
          y2={20.1751}
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#FFFFFF" />
          <Stop offset={1} stopColor="#EDE9FE" />
        </SvgLinearGradient>
      </Defs>
    </Svg>
  );
}

export default function AIPaymentHistoryScreen() {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [paymentRows, setPaymentRows] = useState<
    { id: string; status: PaymentStatus; plan: string; amount: number; date: string }[]
  >([]);

  useEffect(() => {
    void apiService.getAISubscriptionPayments().then((response) => {
      setPaymentRows(
        response.data.map((payment) => ({
          id: payment.orderId,
          status: payment.status === "successful" ? "successful" : "unsuccessful",
          plan: payment.plan,
          amount: payment.amount,
          date: new Date(payment.paidAt || payment.createdAt).toLocaleDateString(
            language === "ka" ? "ka-GE" : language === "ru" ? "ru-RU" : "en-US",
          ),
        })),
      );
    }).catch((error) => {
      console.warn("⚠️ [AI payment history] Could not load payments:", error);
    });
  }, [language]);

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            title: "Payment History",
            assistant: "AI Assistant",
            poweredBy: "Powered By Happtic",
            all: "All",
            successful: "Successful",
            unsuccessful: "Unsuccessful",
            year: "2026",
            standardMonthly: "Standard —\nMonthly",
            dates: {
              august: "August 5, 2026",
              july: "July 6, 2026",
              julyFailed: "July 5, 2026",
              june: "June 5, 2026",
              may: "May 5, 2026",
            },
            amountSuffix: "GEL",
            paid: "Paid",
            failed: "Failed to charge",
          }
        : language === "ru"
          ? {
              title: "История платежей",
              assistant: "AI Ассистент",
              poweredBy: "Powered By Happtic",
              all: "Все",
              successful: "Успешные",
              unsuccessful: "Неуспешные",
              year: "2026",
              standardMonthly: "Стандарт —\nМесячный",
              dates: {
                august: "5 августа, 2026",
                july: "6 июля, 2026",
                julyFailed: "5 июля, 2026",
                june: "5 июня, 2026",
                may: "5 мая, 2026",
              },
              amountSuffix: "лари",
              paid: "Оплачено",
              failed: "Не удалось списать",
            }
          : {
              title: "გადახდების ისტორია",
              assistant: "AI ასისტენტი",
              poweredBy: "Powered By Happtic",
              all: "ყველა",
              successful: "წარმატებული",
              unsuccessful: "წარუმატებელი",
              year: "2026",
              standardMonthly: "სტანდარტი —\nყოველთვიური",
              dates: {
                august: "5 აგვისტო, 2026",
                july: "6 ივლისი, 2026",
                julyFailed: "5 ივლისი, 2026",
                june: "5 ივნისი, 2026",
                may: "5 მაისი, 2026",
              },
              amountSuffix: "ლარი",
              paid: "გადახდილია",
              failed: "ვერ ჩამოიჭრა",
            },
    [language],
  );

  const filteredRows = paymentRows.filter((row) =>
    filter === "all" ? true : row.status === filter,
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.72}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <AISparkleLogo />
        <View>
          <Text style={styles.headerTitle}>{copy.assistant}</Text>
          <Text style={styles.headerSubtitle}>{copy.poweredBy}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{copy.title}</Text>

        <View style={styles.filtersRow}>
          {(["all", "successful", "unsuccessful"] as const).map((item) => {
            const isActive = filter === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterButton, isActive && styles.filterActive]}
                activeOpacity={0.8}
                onPress={() => setFilter(item)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {copy[item]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.yearLabel}>{copy.year}</Text>

        <View style={styles.list}>
          {filteredRows.map((row) => {
            const isSuccessful = row.status === "successful";
            return (
              <View key={row.id} style={styles.paymentRow}>
                <View
                  style={[
                    styles.statusIcon,
                    !isSuccessful && styles.statusIconFailed,
                  ]}
                >
                  <Ionicons
                    name={isSuccessful ? "checkmark" : "close"}
                    size={26}
                    color={isSuccessful ? "#16A34A" : "#DC2626"}
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentPlan}>
                    {row.plan === "premium" ? "Premium" : copy.standardMonthly}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {row.date}
                  </Text>
                </View>
                <View style={styles.paymentMeta}>
                  <Text style={styles.paymentAmount}>
                    {row.amount} {copy.amountSuffix}
                  </Text>
                  <View
                    style={[
                      styles.paymentBadge,
                      !isSuccessful && styles.paymentBadgeFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentBadgeText,
                        !isSuccessful && styles.paymentBadgeTextFailed,
                      ]}
                    >
                      {isSuccessful ? copy.paid : copy.failed}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    height: 82,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(31, 41, 55, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 16,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 15,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    lineHeight: 24,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  filterButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#6D64F2",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  filterActive: {
    backgroundColor: "#6D64F2",
  },
  filterText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6D64F2",
    lineHeight: 17,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  yearLabel: {
    marginTop: 16,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    lineHeight: 18,
  },
  list: {
    marginTop: 10,
    gap: 10,
  },
  paymentRow: {
    minHeight: 84,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E8F8EF",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconFailed: {
    backgroundColor: "#FDE8E8",
  },
  paymentInfo: {
    flex: 1,
    minWidth: 0,
  },
  paymentPlan: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    lineHeight: 21,
  },
  paymentDate: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#7B7B7B",
    lineHeight: 15,
  },
  paymentMeta: {
    minWidth: 78,
    alignItems: "flex-end",
    gap: 8,
  },
  paymentAmount: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: "#000000",
    lineHeight: 17,
  },
  paymentBadge: {
    minHeight: 22,
    borderRadius: 11,
    backgroundColor: "#E8F8EF",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentBadgeFailed: {
    backgroundColor: "#FDE8E8",
  },
  paymentBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#16A34A",
    lineHeight: 14,
  },
  paymentBadgeTextFailed: {
    color: "#DC2626",
  },
});
