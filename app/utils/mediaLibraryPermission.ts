import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";

/**
 * Android 13+ (API 33) uses the System Photo Picker —
 * READ_MEDIA_IMAGES is not required to open the gallery.
 */
export function androidUsesSystemPhotoPicker(): boolean {
  return Platform.OS === "android" && Number(Platform.Version) >= 33;
}

function openAppSettings() {
  void Linking.openSettings();
}

function alertOpenSettings(message: string) {
  Alert.alert("წვდომა აკრძალულია", message, [
    { text: "გაუქმება", style: "cancel" },
    { text: "პარამეტრები", onPress: openAppSettings },
  ]);
}

/** @returns true if the image picker can be opened */
export async function ensureMediaLibraryAccess(options?: {
  message?: string;
}): Promise<boolean> {
  const message =
    options?.message ??
    "ფოტოებზე წვდომა საჭიროა. გთხოვთ ჩართოთ პარამეტრებში.";

  // Android 13/14+: Photo Picker — no storage permission needed
  if (androidUsesSystemPhotoPicker()) {
    return true;
  }

  if (Platform.OS === "web") {
    return true;
  }

  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.status === "granted" || current.accessPrivileges === "limited") {
    return true;
  }

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (
    requested.status === "granted" ||
    requested.accessPrivileges === "limited"
  ) {
    return true;
  }

  if (requested.canAskAgain === false) {
    alertOpenSettings(message);
    return false;
  }

  Alert.alert("წვდომა აკრძალულია", message, [{ text: "კარგი" }]);
  return false;
}

export async function ensureCameraAccess(options?: {
  message?: string;
}): Promise<boolean> {
  const message =
    options?.message ??
    "კამერის გამოსაყენებლად საჭიროა კამერის წვდომა. გთხოვთ ჩართოთ პარამეტრებში.";

  if (Platform.OS === "web") {
    return true;
  }

  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.status === "granted") {
    return true;
  }

  const requested = await ImagePicker.requestCameraPermissionsAsync();
  if (requested.status === "granted") {
    return true;
  }

  if (requested.canAskAgain === false) {
    alertOpenSettings(message);
    return false;
  }

  Alert.alert("წვდომა", message, [{ text: "კარგი" }]);
  return false;
}
