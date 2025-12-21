import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../../services/api";

interface FAQItem {
  question: string;
  answer: string;
}

interface ContactInfo {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  workingHours?: string;
}

type TabType = "faq" | "contact";

const HelpCenterScreen = () => {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(
    (params.tab as TabType) || "faq"
  );
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});

  useEffect(() => {
    console.log("HelpCenterScreen mounted");
    loadHelpCenter();
  }, []);

  // Update active tab when params change
  useEffect(() => {
    if (params.tab === "contact" || params.tab === "faq") {
      setActiveTab(params.tab as TabType);
    }
  }, [params.tab]);

  const loadHelpCenter = async () => {
    try {
      setLoading(true);
      const response = await apiService.getHelpCenter();
      if (response.success && response.data) {
        setFaqs(response.data.faqs || []);
        setContactInfo(response.data.contactInfo || {});
      }
    } catch (error) {
      console.error("Failed to load help center:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleBack = () => {
    router.back();
  };

  const handlePhoneCall = () => {
    if (contactInfo.phone) {
      Linking.openURL(`tel:${contactInfo.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (contactInfo.whatsapp) {
      const phoneNumber = contactInfo.whatsapp.replace(/[^0-9]/g, "");
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}`);
    }
  };

  const handleEmail = () => {
    if (contactInfo.email) {
      Linking.openURL(`mailto:${contactInfo.email}`);
    }
  };

  const handleWebsite = () => {
    if (contactInfo.website) {
      const url = contactInfo.website.startsWith("http")
        ? contactInfo.website
        : `https://${contactInfo.website}`;
      Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>დახმარების ცენტრი</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange("faq")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "faq" && styles.activeTabText,
            ]}
          >
            FAQ
          </Text>
          {activeTab === "faq" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange("contact")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "contact" && styles.activeTabText,
            ]}
          >
            კონტაქტი
          </Text>
          {activeTab === "contact" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#20BEB8" />
          </View>
        ) : activeTab === "faq" ? (
          <View style={styles.faqContainer}>
            {faqs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="help-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>FAQ ჯერ არ არის დამატებული</Text>
              </View>
            ) : (
              faqs.map((faq, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(index)}
                >
                  <View style={styles.faqContent}>
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    {expandedFAQ === index && (
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    )}
                  </View>
                  <Feather
                    name={expandedFAQ === index ? "arrow-up" : "arrow-down"}
                    size={20}
                    color={expandedFAQ === index ? "#20BEB8" : "#6B7280"}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.contactContainer}>
            {contactInfo.phone && (
              <TouchableOpacity style={styles.contactItem} onPress={handlePhoneCall}>
                <View style={styles.contactLeft}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="call-outline" size={20} color="#20BEB8" />
                  </View>
                  <View style={styles.contactInfoView}>
                    <Text style={styles.contactTitle}>ტელეფონი</Text>
                    <Text style={styles.contactValue}>{contactInfo.phone}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {contactInfo.whatsapp && (
              <TouchableOpacity style={styles.contactItem} onPress={handleWhatsApp}>
                <View style={styles.contactLeft}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="logo-whatsapp" size={20} color="#20BEB8" />
                  </View>
                  <View style={styles.contactInfoView}>
                    <Text style={styles.contactTitle}>WhatsApp</Text>
                    <Text style={styles.contactValue}>{contactInfo.whatsapp}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {contactInfo.email && (
              <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
                <View style={styles.contactLeft}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="mail-outline" size={20} color="#20BEB8" />
                  </View>
                  <View style={styles.contactInfoView}>
                    <Text style={styles.contactTitle}>ელ-ფოსტა</Text>
                    <Text style={styles.contactValue}>{contactInfo.email}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {contactInfo.website && (
              <TouchableOpacity style={styles.contactItem} onPress={handleWebsite}>
                <View style={styles.contactLeft}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="globe-outline" size={20} color="#20BEB8" />
                  </View>
                  <View style={styles.contactInfoView}>
                    <Text style={styles.contactTitle}>ვებსაიტი</Text>
                    <Text style={styles.contactValue}>{contactInfo.website}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {contactInfo.address && (
              <View style={styles.contactItem}>
                <View style={styles.contactLeft}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="location-outline" size={20} color="#20BEB8" />
                  </View>
                  <View style={styles.contactInfoView}>
                    <Text style={styles.contactTitle}>მისამართი</Text>
                    <Text style={styles.contactValue}>{contactInfo.address}</Text>
                  </View>
                </View>
              </View>
            )}

            {contactInfo.workingHours && (
              <View style={styles.contactItem}>
                <View style={styles.contactLeft}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="time-outline" size={20} color="#20BEB8" />
                  </View>
                  <View style={styles.contactInfoView}>
                    <Text style={styles.contactTitle}>სამუშაო საათები</Text>
                    <Text style={styles.contactValue}>{contactInfo.workingHours}</Text>
                  </View>
                </View>
              </View>
            )}

            {!contactInfo.phone && !contactInfo.whatsapp && !contactInfo.email && !contactInfo.website && (
              <View style={styles.emptyContainer}>
                <Ionicons name="call-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>საკონტაქტო ინფორმაცია ჯერ არ არის დამატებული</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    position: "relative",
  },
  tabText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#20BEB8",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#20BEB8",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
  },
  // FAQ Styles
  faqContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  faqItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  faqContent: {
    flex: 1,
    marginRight: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 20,
  },
  // Contact Styles
  contactContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactInfoView: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
});

export default HelpCenterScreen;
