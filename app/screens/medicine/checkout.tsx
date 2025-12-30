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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePlaceOrder = () => {
    // Validate form
    if (!formData.fullName || !formData.email || !formData.phone || !formData.address) {
      Alert.alert("შეცდომა", "გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
      return;
    }

    // Validate card data if credit card is selected
    if (paymentMethod === "card") {
      if (!cardData.cardNumber || !cardData.cardHolder || !cardData.expiryDate || !cardData.cvv) {
        Alert.alert("შეცდომა", "გთხოვთ შეავსოთ ბარათის ყველა დეტალი");
        return;
      }
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
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderSummaryCard}>
            {cartItems.map((item) => {
              const isTest = item.clinic || item.clinicId;
              return (
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      {isTest ? item.weight : `${item.weight} × ${item.quantity}`}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    ${isTest ? item.price : item.price * item.quantity}
                  </Text>
                </View>
              );
            })}
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>${getTotalPrice()}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(value) => handleInputChange("fullName", value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                placeholder="Enter your email"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => handleInputChange("phone", value)}
                placeholder="Enter your phone number"
                placeholderTextColor="#999999"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(value) => handleInputChange("address", value)}
                placeholder="Enter your full address"
                placeholderTextColor="#999999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(value) => handleInputChange("city", value)}
                  placeholder="Enter city"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>ZIP Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.zipCode}
                  onChangeText={(value) => handleInputChange("zipCode", value)}
                  placeholder="Enter ZIP code"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>გადახდის მეთოდი</Text>
          <View style={styles.paymentCard}>
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setPaymentMethod("cash")}
            >
              <Ionicons name="cash-outline" size={24} color={paymentMethod === "cash" ? "#20BEB8" : "#999999"} />
              <Text style={[styles.paymentText, paymentMethod !== "cash" && styles.paymentTextInactive]}>
                ნაღდი ფული მიტანისას
              </Text>
              {paymentMethod === "cash" && (
                <Ionicons name="checkmark-circle" size={24} color="#20BEB8" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => {
                setPaymentMethod("card");
                setShowCardModal(true);
              }}
            >
              <Ionicons name="card-outline" size={24} color={paymentMethod === "card" ? "#20BEB8" : "#999999"} />
              <Text style={[styles.paymentText, paymentMethod !== "card" && styles.paymentTextInactive]}>
                საბანკო ბარათი
              </Text>
              {paymentMethod === "card" && (
                <Ionicons name="checkmark-circle" size={24} color="#20BEB8" />
              )}
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
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
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
    color: "#333333",
    marginBottom: 12,
  },
  orderSummaryCard: {
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
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#333333",
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
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  totalPrice: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#20BEB8",
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
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  paymentTextInactive: {
    color: "#999999",
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
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default Checkout;
