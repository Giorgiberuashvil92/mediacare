import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const Services = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>სერვისები რომელსაც გთავაზობთ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={{ flexDirection: "row", gap: 12 }}
          onPress={() => router.push("/screens/doctors/topdoctors")}
          activeOpacity={0.8}
        >
          <View style={styles.serviceCard}>
            <Image
              style={{ width: 97, height: 97, borderRadius: 8 }}
              source={{
                uri: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=400&fit=crop&crop=center",
              }}
              contentFit="cover"
            />
            <Text style={styles.serviceTitle}>სწრაფი კონსულტაცია</Text>
            <Text style={styles.serviceDescription}>დაწყება 50₾-დან</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F2F2F7",
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  serviceCard: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    gap: 8,
  },
  serviceTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  serviceDescription: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#64748B",
  },
});

export default Services;
