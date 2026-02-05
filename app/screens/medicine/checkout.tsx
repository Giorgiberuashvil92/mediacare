import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../../contexts/CartContext";

const Checkout = () => {
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

  const handlePlaceOrder = () => {
    // Validate card data
    if (!cardData.cardNumber || !cardData.cardHolder || !cardData.expiryDate || !cardData.cvv) {
      Alert.alert("შეცდომა", "გთხოვთ შეავსოთ ბარათის ყველა დეტალი");
      return;
    }

    // Simulate order placement
    Alert.alert(
      "შეკვეთა გაფორმდა!",
      "თქვენი შეკვეთა წარმატებით გაფორმდა. მალე მიიღებთ დადასტურების ელფოსტას.",
      [
        {
          text: "OK",
          onPress: () => {
            clearCart();
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    // Add spaces every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>გადახდა</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>შეკვეთის დეტალები</Text>
          <View style={styles.orderSummaryCard}>
            {cartItems.map((item) => {
              const isTest = item.clinic || item.clinicId;
              const displayPrice = isTest ? item.price : item.price * item.quantity;
              return (
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.homeCollection && (
                      <Text style={styles.itemDetails}>
                        მისამართი: {item.homeCollection.address}
                      </Text>
                    )}
                    {item.homeCollection && (
                      <Text style={styles.itemDetails}>
                        {item.homeCollection.date} {item.homeCollection.time}
                      </Text>
                    )}
                    {!item.homeCollection && (
                      <Text style={styles.itemDetails}>
                        {isTest ? item.weight : `${item.weight} × ${item.quantity}`}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.itemPrice}>
                    {displayPrice} ₾
                  </Text>
                </View>
              );
            })}
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>საერთო თანხა</Text>
              <Text style={styles.totalPrice}>{getTotalPrice()} ₾</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>გადახდის მეთოდი</Text>
          <View style={styles.paymentCard}>
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setShowCardModal(true)}
            >
              <View style={styles.paymentIconContainer}>
                <Ionicons name="card-outline" size={28} color="#06B6D4" />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentText}>საბანკო ბარათი</Text>
                <Text style={styles.paymentSubtext}>
                  {cardData.cardNumber ? `**** ${cardData.cardNumber.slice(-4)}` : "დაამატეთ ბარათი"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999999" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder}>
          <Text style={styles.placeOrderButtonText}>შეკვეთის გაფორმება</Text>
        </TouchableOpacity>
      </View>

      {/* Credit Card Modal */}
      <Modal
        visible={showCardModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ბარათის დეტალები</Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ბარათის ნომერი *</Text>
                <TextInput
                  style={styles.input}
                  value={cardData.cardNumber}
                  onChangeText={(value) => setCardData({ ...cardData, cardNumber: formatCardNumber(value) })}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ბარათის მფლობელი *</Text>
                <TextInput
                  style={styles.input}
                  value={cardData.cardHolder}
                  onChangeText={(value) => setCardData({ ...cardData, cardHolder: value.toUpperCase() })}
                  placeholder="JOHN DOE"
                  placeholderTextColor="#999999"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>ვადა *</Text>
                  <TextInput
                    style={styles.input}
                    value={cardData.expiryDate}
                    onChangeText={(value) => setCardData({ ...cardData, expiryDate: formatExpiryDate(value) })}
                    placeholder="MM/YY"
                    placeholderTextColor="#999999"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>CVV *</Text>
                  <TextInput
                    style={styles.input}
                    value={cardData.cvv}
                    onChangeText={(value) => setCardData({ ...cardData, cvv: value.replace(/\D/g, "").slice(0, 3) })}
                    placeholder="123"
                    placeholderTextColor="#999999"
                    keyboardType="numeric"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  if (cardData.cardNumber && cardData.cardHolder && cardData.expiryDate && cardData.cvv) {
                    setShowCardModal(false);
                  } else {
                    Alert.alert("შეცდომა", "გთხოვთ შეავსოთ ყველა ველი");
                  }
                }}
              >
                <Text style={styles.modalButtonText}>დადასტურება</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#06B6D4",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    marginBottom: 16,
  },
  orderSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
  },
  totalPrice: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#06B6D4",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  paymentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
    marginBottom: 4,
  },
  paymentSubtext: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  modalButton: {
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  placeOrderButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#06B6D4",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default Checkout;
