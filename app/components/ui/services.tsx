import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const Services = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Services we offer</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.serviceCard}>
            <Image
              style={{ width: 97, height: 97, borderRadius: 8 }}
              source={{
                uri: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=400&fit=crop&crop=center"
              }}
              contentFit="cover"
            />
            <Text style={styles.serviceTitle}>სწრაფი კონსულტაცია</Text>
            <Text style={styles.serviceDescription}>დაწყება $50-დან</Text>
          </View>
          <View style={styles.serviceCard}>
            <Image
              style={{ width: 97, height: 97, borderRadius: 8 }}
              source={{
                uri: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center"
              }}
              contentFit="cover"
            />
            <Text style={styles.serviceTitle}>სპეციალისტის ჯავშანი</Text>
            <Text style={styles.serviceDescription}>დაწყება $100-დან</Text>
          </View>
          <View style={styles.serviceCard}>
            <Image
              style={{ width: 97, height: 97, borderRadius: 8 }}
              source={{
                uri: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop&crop=center"
              }}
              contentFit="cover"
            />
            <Text style={styles.serviceTitle}>Order Medicine</Text>
            <Text style={styles.serviceDescription}>Delivery in 1 hour</Text>
          </View>
        </View>
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
