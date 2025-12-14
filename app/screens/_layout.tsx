import { Stack } from "expo-router";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Medicine Routes */}
      <Stack.Screen name="medicine/categories" />
      <Stack.Screen name="medicine/category-details" />
      <Stack.Screen name="medicine/product-details" />

      {/* Lab Routes */}
      <Stack.Screen name="lab/product/[id]" />
      <Stack.Screen name="lab/select-clinic" />

      {/* Doctors Routes */}
      <Stack.Screen name="doctors/departments" />
      <Stack.Screen name="doctors/doctors-list" />
      <Stack.Screen name="doctors/topdoctors" />
      <Stack.Screen name="doctors/doctor/[id]" />

      {/* Auth Routes */}
      <Stack.Screen name="auth/onboarding" />
      <Stack.Screen name="auth/roleSelection" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />

      {/* Profile Routes */}
      <Stack.Screen name="profile/profile" />
      <Stack.Screen name="profile/edit-profile" />
      <Stack.Screen name="profile/medical-records" />
      <Stack.Screen name="profile/medical-cabinet" />
      <Stack.Screen name="profile/favourites" />
      <Stack.Screen name="profile/payment" />
      <Stack.Screen name="profile/newPayment" />
      <Stack.Screen name="profile/language" />
      <Stack.Screen name="profile/helpCenter" />
      <Stack.Screen name="profile/terms/cancellation" />
      <Stack.Screen name="profile/terms/service" />
      <Stack.Screen name="profile/terms/privacy" />

      {/* Video Call Route */}
      <Stack.Screen 
        name="video-call" 
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
