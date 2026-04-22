import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from "react-native-webview";
import { apiService, Specialization } from "../../_services/api";
import OTPModal from "../../components/ui/OTPModal";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { showToast } from "../../utils/toast";

export default function RegisterScreen() {
  const { userRole, register } = useAuth();
  const { t } = useLanguage();
  const params = useLocalSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedRole: "doctor" | "patient" = userRole || "patient";

  // Common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Doctor specific fields
  const [selectedSpecializations, setSelectedSpecializations] = useState<
    string[]
  >([]);
  const [licenseDocument, setLicenseDocument] = useState<{
    uri: string;
    name: string;
    type: string;
    filePath?: string;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [profileImage, setProfileImage] = useState<{
    uri: string;
    name: string;
    type: string;
    url?: string;
  } | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [specializationModalVisible, setSpecializationModalVisible] =
    useState(false);

  // Additional doctor fields (matching admin panel)
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [degrees, setDegrees] = useState("");
  const [experience, setExperience] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tosModalVisible, setTosModalVisible] = useState(false);
  const [hasAcceptedTos, setHasAcceptedTos] = useState(false);
  const [showLicenseInfoModal, setShowLicenseInfoModal] = useState(false);

  // Phone verification states
  const [verificationCode, setVerificationCode] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);

  // Patient specific fields
  const [address, setAddress] = useState("");
  const [identificationDocument, setIdentificationDocument] = useState<{
    uri: string;
    name: string;
    type: string;
    filePath?: string;
  } | null>(null);
  const [uploadingIdentificationDocument, setUploadingIdentificationDocument] =
    useState(false);

  // Nationality selection (only for patients)
  const [nationality, setNationality] = useState<
    "georgian" | "non-georgian" | null
  >(null);
  const [showPassportInfoModal, setShowPassportInfoModal] = useState(false);

  // IDENTOMAT states
  const [showIdentomatModal, setShowIdentomatModal] = useState(false);
  const [identomatUrl, setIdentomatUrl] = useState<string>("");
  const [isIdentomatVerified, setIsIdentomatVerified] = useState(false);
  const [identomatData, setIdentomatData] = useState<any>(null);
  const [identomatSessionToken, setIdentomatSessionToken] =
    useState<string>("");
  const [identomatLoading, setIdentomatLoading] = useState(false);

  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const idNumberInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const degreesInputRef = useRef<TextInput>(null);
  const experienceInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);
  const aboutInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const addressInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const loadSpecializations = async () => {
      if (selectedRole !== "doctor") {
        setSpecializations([]);
        setSelectedSpecializations([]);
        setLicenseDocument(null);
        setProfileImage(null);
        // Reset doctor-specific fields (keep phone for all users)
        setDegrees("");
        setExperience("");
        setAbout("");
        setLocation("");
        setDateOfBirth("");
        setGender("male");
        return;
      }

      try {
        setLoadingSpecializations(true);
        const response = await apiService.getSpecializations();
        if (response.success) {
          setSpecializations(response.data.filter((spec) => spec.isActive));
          setSelectedSpecializations((prev) =>
            response.data
              .filter((spec) => spec.isActive && prev.includes(spec.name))
              .map((spec) => spec.name),
          );
        }
      } catch (error) {
        console.error("Failed to load specializations", error);
        setSpecializations([]);
      } finally {
        setLoadingSpecializations(false);
      }
    };

    loadSpecializations();
  }, [selectedRole]);

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        const currentDate = selectedDate;
        setSelectedDate(currentDate);

        // Format the date as YYYY-MM-DD for backend
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        setDateOfBirth(formattedDate);
      }
      setShowDatePicker(false);
    } else {
      // iOS - update date as user scrolls
      if (selectedDate) {
        setSelectedDate(selectedDate);
        const currentDate = selectedDate;

        // Format the date as YYYY-MM-DD for backend
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        setDateOfBirth(formattedDate);
      }
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      // Check file size (max 5MB)
      if (file.size && file.size > 5 * 1024 * 1024) {
        showToast.error("ფაილის ზომა არ უნდა აღემატებოდეს 5MB-ს", "შეცდომა");
        return;
      }

      // Upload (mock or real)
      setUploadingFile(true);
      if (apiService.isMockMode()) {
        setLicenseDocument({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/pdf",
          filePath: "/uploads/licenses/mock-license.pdf",
        });
        showToast.success("ფაილი წარმატებით აიტვირთა (mock)", "წარმატება");
      } else {
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/pdf",
        } as any);

        const response = await fetch(
          `${apiService.getBaseURL()}/upload/license`,
          {
            method: "POST",
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        const data = await response.json();

        if (data.success) {
          setLicenseDocument({
            uri: file.uri,
            name: file.name,
            type: file.mimeType || "application/pdf",
            filePath: data.data.filePath,
          });
          showToast.success("ფაილი წარმატებით აიტვირთა", "წარმატება");
        } else {
          throw new Error(data.message || "ფაილის ატვირთვა ვერ მოხერხდა");
        }
      }
    } catch (error) {
      console.error("File pick error:", error);
      showToast.error(
        error instanceof Error ? error.message : "ფაილის ატვირთვა ვერ მოხერხდა",
        "შეცდომა",
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleProfileImagePick = async () => {
    console.log("========================================");
    console.log("📸 [ProfileImage] ===== BUTTON PRESSED =====");
    console.log("📸 [ProfileImage] Timestamp:", new Date().toISOString());
    console.log("📸 [ProfileImage] Platform:", Platform.OS);
    console.log(
      "📸 [ProfileImage] Current state - uploadingProfileImage:",
      uploadingProfileImage,
    );
    console.log(
      "📸 [ProfileImage] Current profileImage:",
      profileImage ? "exists" : "null",
    );
    console.log("========================================");

    // Prevent multiple simultaneous calls
    if (uploadingProfileImage) {
      console.log("⚠️ [ProfileImage] Already uploading, skipping...");
      return;
    }

    try {
      console.log("📸 [ProfileImage] Setting uploading state to true");
      setUploadingProfileImage(true);

      // Request permissions - Android specific handling
      if (Platform.OS === "android") {
        console.log(
          "🤖 [ProfileImage] Android platform detected, checking permissions...",
        );
        try {
          // Check if permission is already granted
          const readPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          );
          console.log(
            "🤖 [ProfileImage] Android permission check result:",
            readPermission,
          );

          if (!readPermission) {
            console.log("🤖 [ProfileImage] Requesting Android permission...");
            // Request permission
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
              {
                title: "ფოტოებზე წვდომა",
                message:
                  "აპლიკაციას სჭირდება ფოტოებზე წვდომა პროფილის სურათის ასარჩევად",
                buttonNeutral: "მოგვიანებით",
                buttonNegative: "არა",
                buttonPositive: "დიახ",
              },
            );
            console.log(
              "🤖 [ProfileImage] Android permission request result:",
              granted,
            );

            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              console.log("❌ [ProfileImage] Android permission denied");
              Alert.alert(
                "წვდომა აკრძალულია",
                "ფოტოებზე წვდომა საჭიროა. გთხოვთ ჩართოთ პარამეტრებში.",
                [{ text: "კარგი" }],
              );
              return;
            }
            console.log("✅ [ProfileImage] Android permission granted");
          } else {
            console.log("✅ [ProfileImage] Android permission already granted");
          }
        } catch (androidPermError) {
          console.error(
            "❌ [ProfileImage] Android permission error:",
            androidPermError,
          );
          console.error(
            "❌ [ProfileImage] Error details:",
            JSON.stringify(androidPermError, null, 2),
          );
          // Fallback to ImagePicker permission request
        }
      } else {
        console.log("🍎 [ProfileImage] iOS platform detected");
      }

      // iOS: launchImageLibraryAsync automatically requests permissions
      // Android: We already handled permissions above
      // For iOS, we can skip explicit permission request and let launchImageLibraryAsync handle it
      if (Platform.OS === "ios") {
        console.log(
          "🍎 [ProfileImage] iOS detected - skipping explicit permission request",
        );
        console.log(
          "🍎 [ProfileImage] launchImageLibraryAsync will handle permissions automatically",
        );
      } else {
        // Request permissions for Android (if not already granted)
        console.log(
          "📸 [ProfileImage] Requesting ImagePicker permissions for Android...",
        );
        console.log(
          "📸 [ProfileImage] ImagePicker available:",
          typeof ImagePicker !== "undefined",
        );
        console.log(
          "📸 [ProfileImage] requestMediaLibraryPermissionsAsync available:",
          typeof ImagePicker.requestMediaLibraryPermissionsAsync === "function",
        );

        let permission;
        try {
          console.log(
            "📸 [ProfileImage] Calling requestMediaLibraryPermissionsAsync...",
          );

          // Add timeout for permission request (10 seconds)
          const permissionPromise =
            ImagePicker.requestMediaLibraryPermissionsAsync();
          const permissionTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              console.error(
                "⏱️ [ProfileImage] Permission request timeout (10s)",
              );
              reject(new Error("Permission request timeout"));
            }, 10000);
          });

          permission = (await Promise.race([
            permissionPromise,
            permissionTimeoutPromise,
          ])) as ImagePicker.MediaLibraryPermissionResponse;
          console.log("✅ [ProfileImage] Permission request completed");
          console.log(
            "📸 [ProfileImage] ImagePicker permission result:",
            JSON.stringify(permission, null, 2),
          );
          console.log(
            "📸 [ProfileImage] Permission status:",
            permission?.status,
          );

          if (!permission || permission.status !== "granted") {
            console.log(
              "❌ [ProfileImage] Permission not granted, status:",
              permission?.status,
            );
            Alert.alert(
              "წვდომა აკრძალულია",
              "ფოტოებზე წვდომა საჭიროა. გთხოვთ ჩართოთ პარამეტრებში.",
              [{ text: "კარგი" }],
            );
            return;
          }
        } catch (permError) {
          console.error(
            "❌ [ProfileImage] Permission request error:",
            permError,
          );
          console.error("❌ [ProfileImage] Error type:", typeof permError);
          console.error(
            "❌ [ProfileImage] Error name:",
            permError instanceof Error ? permError.name : "unknown",
          );
          console.error(
            "❌ [ProfileImage] Error message:",
            permError instanceof Error ? permError.message : "unknown",
          );
          console.error(
            "❌ [ProfileImage] Error stack:",
            permError instanceof Error ? permError.stack : "no stack",
          );
          try {
            console.error(
              "❌ [ProfileImage] Error details (JSON):",
              JSON.stringify(
                permError,
                Object.getOwnPropertyNames(permError),
                2,
              ),
            );
          } catch (jsonError) {
            console.error(
              "❌ [ProfileImage] Could not stringify error:",
              jsonError,
            );
          }
          Alert.alert(
            "შეცდომა",
            "ფოტოებზე წვდომის მოთხოვნა ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა.",
            [{ text: "კარგი" }],
          );
          return;
        }
      }

      console.log("✅ [ProfileImage] Ready to launch image picker...");
      console.log(
        "📸 [ProfileImage] launchImageLibraryAsync available:",
        typeof ImagePicker.launchImageLibraryAsync === "function",
      );

      // Launch image picker with timeout protection
      console.log("📸 [ProfileImage] Launching image picker...");
      let result;
      try {
        // Create a promise with timeout
        console.log("📸 [ProfileImage] Creating picker promise...");
        console.log("📸 [ProfileImage] Picker options:", {
          mediaTypes: "Images",
          allowsEditing: true,
          quality: 0.8,
          selectionLimit: 1,
          aspect: [1, 1],
        });

        const pickerPromise = ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          selectionLimit: 1,
          aspect: [1, 1], // Square aspect ratio for profile images
        });
        console.log("✅ [ProfileImage] Picker promise created");
        console.log(
          "📸 [ProfileImage] Picker promise type:",
          typeof pickerPromise,
        );
        console.log(
          "📸 [ProfileImage] Picker promise is Promise:",
          pickerPromise instanceof Promise,
        );

        // Add timeout (30 seconds)
        console.log("📸 [ProfileImage] Creating timeout promise (30s)...");
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error("⏱️ [ProfileImage] Timeout reached (30s)");
            reject(new Error("სურათის არჩევა დრო ამოიწურა"));
          }, 30000);
        });
        console.log("✅ [ProfileImage] Timeout promise created");

        console.log("📸 [ProfileImage] Starting Promise.race...");
        console.log("📸 [ProfileImage] Picker promise state:", pickerPromise);
        console.log("📸 [ProfileImage] Timeout promise state:", timeoutPromise);

        try {
          result = (await Promise.race([
            pickerPromise,
            timeoutPromise,
          ])) as ImagePicker.ImagePickerResult;
          console.log("✅ [ProfileImage] Promise.race completed");
          console.log(
            "📸 [ProfileImage] Picker result received:",
            JSON.stringify(
              {
                canceled: result?.canceled,
                assetsCount: result?.assets?.length,
                hasAssets: !!result?.assets,
                resultType: typeof result,
              },
              null,
              2,
            ),
          );
        } catch (raceError) {
          console.error("❌ [ProfileImage] Promise.race error:", raceError);
          throw raceError;
        }
      } catch (pickerError) {
        console.error(
          "❌ [ProfileImage] Image picker launch error:",
          pickerError,
        );
        console.error("❌ [ProfileImage] Error type:", typeof pickerError);
        console.error(
          "❌ [ProfileImage] Error details:",
          JSON.stringify(
            pickerError,
            Object.getOwnPropertyNames(pickerError),
            2,
          ),
        );
        const errorMsg =
          pickerError instanceof Error
            ? pickerError.message
            : "სურათის არჩევის ფანჯარა ვერ გაიხსნა";

        console.error("❌ [ProfileImage] Showing error alert:", errorMsg);
        Alert.alert("შეცდომა", errorMsg, [{ text: "კარგი" }]);
        return;
      }

      if (!result) {
        console.error("❌ [ProfileImage] Image picker returned null/undefined");
        Alert.alert(
          "შეცდომა",
          "სურათის არჩევა ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა.",
          [{ text: "კარგი" }],
        );
        return;
      }

      if (result.canceled) {
        console.log("ℹ️ [ProfileImage] User canceled image selection");
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.error("❌ [ProfileImage] No assets in result");
        console.error(
          "❌ [ProfileImage] Result structure:",
          JSON.stringify(result, null, 2),
        );
        showToast.error("სურათი არ აირჩევა", "შეცდომა");
        return;
      }

      console.log("✅ [ProfileImage] Asset found, processing...");
      const asset = result.assets[0];
      console.log(
        "📸 [ProfileImage] Asset details:",
        JSON.stringify(
          {
            uri: asset?.uri?.substring(0, 50) + "...",
            fileName: asset?.fileName,
            fileSize: asset?.fileSize,
            mimeType: asset?.mimeType,
            width: asset?.width,
            height: asset?.height,
          },
          null,
          2,
        ),
      );

      if (!asset || !asset.uri) {
        console.error("❌ [ProfileImage] Asset or URI is missing");
        console.error(
          "❌ [ProfileImage] Asset:",
          JSON.stringify(asset, null, 2),
        );
        showToast.error("სურათის URI არ მოიძებნა", "შეცდომა");
        return;
      }

      const fileSize = asset.fileSize ?? 0;
      const fileName = asset.fileName || `profile_${Date.now()}.jpg`;
      const fileType = asset.mimeType || "image/jpeg";

      console.log("📸 [ProfileImage] File info:", {
        fileName,
        fileType,
        fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
        uri: asset.uri.substring(0, 50) + "...",
      });

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(fileType.toLowerCase())) {
        console.error("❌ [ProfileImage] Invalid file type:", fileType);
        showToast.error(
          "მხოლოდ JPG, PNG ან WEBP ფორმატის სურათებია დაშვებული",
          "შეცდომა",
        );
        return;
      }

      // Validate file size
      if (fileSize > 5 * 1024 * 1024) {
        console.error("❌ [ProfileImage] File too large:", fileSize);
        showToast.error("სურათის ზომა არ უნდა აღემატებოდეს 5MB-ს", "შეცდომა");
        return;
      }

      // Validate URI format
      if (
        !asset.uri ||
        (!asset.uri.startsWith("file://") &&
          !asset.uri.startsWith("content://") &&
          !asset.uri.startsWith("http"))
      ) {
        console.error("❌ [ProfileImage] Invalid URI format:", asset.uri);
        showToast.error("არასწორი სურათის ფორმატი", "შეცდომა");
        return;
      }

      console.log("✅ [ProfileImage] All validations passed");

      if (apiService.isMockMode()) {
        console.log("🎭 [ProfileImage] Mock mode - skipping upload");
        setProfileImage({
          uri: asset.uri,
          name: fileName,
          type: fileType,
          url: asset.uri,
        });
        showToast.success("სურათი აიტვირთა (mock)", "წარმატება");
        console.log("✅ [ProfileImage] Mock upload completed");
        return;
      }

      // Real upload
      console.log("📤 [ProfileImage] Starting real upload...");
      console.log("📤 [ProfileImage] Upload params:", {
        uri: asset.uri.substring(0, 50) + "...",
        name: fileName,
        type: fileType,
      });

      try {
        const response = await apiService.uploadProfileImagePublic({
          uri: asset.uri,
          name: fileName,
          type: fileType,
        });

        console.log(
          "📤 [ProfileImage] Upload response received:",
          JSON.stringify(
            {
              success: response?.success,
              hasUrl: !!response?.url,
              url: response?.url?.substring(0, 50) + "...",
              hasPublicId: !!response?.publicId,
            },
            null,
            2,
          ),
        );

        if (!response || !response.url) {
          console.error(
            "❌ [ProfileImage] Invalid response:",
            JSON.stringify(response, null, 2),
          );
          throw new Error("Invalid response from server");
        }

        console.log("✅ [ProfileImage] Setting profile image state");
        setProfileImage({
          uri: asset.uri,
          name: fileName,
          type: fileType,
          url: response.url,
        });
        console.log("✅ [ProfileImage] Profile image set successfully");
        showToast.success("სურათი წარმატებით აიტვირთა", "წარმატება");
        console.log("✅ [ProfileImage] Upload completed successfully");
      } catch (uploadError) {
        console.error("❌ [ProfileImage] Upload error:", uploadError);
        console.error(
          "❌ [ProfileImage] Upload error type:",
          typeof uploadError,
        );
        console.error(
          "❌ [ProfileImage] Upload error details:",
          JSON.stringify(
            uploadError,
            Object.getOwnPropertyNames(uploadError),
            2,
          ),
        );
        const uploadErrorMessage =
          uploadError instanceof Error
            ? uploadError.message
            : "სურათის ატვირთვა ვერ მოხერხდა";
        console.error(
          "❌ [ProfileImage] Showing upload error:",
          uploadErrorMessage,
        );
        showToast.error(uploadErrorMessage, "შეცდომა");
        // Don't reset profile image on upload error - keep the selected image
      }
    } catch (error) {
      console.error("❌ [ProfileImage] Profile image pick error:", error);
      console.error("❌ [ProfileImage] Error type:", typeof error);
      console.error(
        "❌ [ProfileImage] Error details:",
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      );
      const errorMessage =
        error instanceof Error ? error.message : "სურათის არჩევა ვერ მოხერხდა";

      console.error("❌ [ProfileImage] Showing error:", errorMessage);
      showToast.error(errorMessage, "შეცდომა");
    } finally {
      console.log("🏁 [ProfileImage] Setting uploading state to false");
      setUploadingProfileImage(false);
      console.log("🏁 [ProfileImage] Process completed");
    }
  };

  const handleIdentificationDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      // Check file size (max 5MB)
      if (file.size && file.size > 5 * 1024 * 1024) {
        showToast.error("ფაილის ზომა არ უნდა აღემატებოდეს 5MB-ს", "შეცდომა");
        return;
      }

      // Upload (mock or real)
      setUploadingIdentificationDocument(true);
      if (apiService.isMockMode()) {
        setIdentificationDocument({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/pdf",
          filePath: "/uploads/identification/mock-id.pdf",
        });
        showToast.success("ფაილი წარმატებით აიტვირთა (mock)", "წარმატება");
      } else {
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/pdf",
        } as any);

        const response = await fetch(
          `${apiService.getBaseURL()}/upload/identification`,
          {
            method: "POST",
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        const data = await response.json();

        if (data.success) {
          // Use Cloudinary URL (data.data.url or data.data.filePath)
          const cloudinaryUrl = data.data.url || data.data.filePath;
          console.log(
            "✅ [Register] Identification document uploaded to Cloudinary:",
            {
              url: cloudinaryUrl,
              publicId: data.data.publicId,
              fileName: file.name,
            },
          );
          setIdentificationDocument({
            uri: file.uri,
            name: file.name,
            type: file.mimeType || "application/pdf",
            filePath: cloudinaryUrl, // Now contains Cloudinary URL instead of local path
          });
          showToast.success("ფაილი წარმატებით აიტვირთა", "წარმატება");
        } else {
          throw new Error(data.message || "ფაილის ატვირთვა ვერ მოხერხდა");
        }
      }
    } catch (error) {
      console.error("Identification document pick error:", error);
      showToast.error(
        error instanceof Error ? error.message : "ფაილის ატვირთვა ვერ მოხერხდა",
        "შეცდომა",
      );
    } finally {
      setUploadingIdentificationDocument(false);
    }
  };

  const handleOTPVerified = async (
    code: string,
    verificationResponse?: any,
  ) => {
    console.log("✅ [Register] OTP verified:", {
      code: code,
      hasVerificationResponse: !!verificationResponse,
      verified: verificationResponse?.verified,
    });

    setVerificationCode(code);
    setIsPhoneVerified(true);
    setShowOTPModal(false);

    // If verification was successful, we can proceed with registration
    // The actual registration will happen when user clicks "Sign Up" button
    // This just marks the phone as verified
  };

  const handleSignup = async () => {
    // Detailed validation logging
    console.log("🔍 [Register] Validation check:", {
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      idNumber: idNumber.trim(),
      isDoctor,
      nationality,
      phone: phone.trim(),
      isPhoneVerified,
      verificationCode: verificationCode.trim(),
      verificationCodeLength: verificationCode.trim().length,
      hasAcceptedTos,
      selectedRole,
      selectedSpecializations: selectedSpecializations.length,
      passwordLength: password.length,
      isIdentomatVerified,
    });

    // If IDENTOMAT is verified, use idNumber from identomatData if idNumber state is empty
    let finalIdNumber = idNumber.trim();
    if (!finalIdNumber && isIdentomatVerified && identomatData?.idNumber) {
      finalIdNumber = identomatData.idNumber;
      setIdNumber(finalIdNumber); // Update state for consistency
    }

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim() ||
      !finalIdNumber
    ) {
      console.log("❌ [Register] Basic fields validation failed:", {
        name: !!name.trim(),
        email: !!email.trim(),
        password: !!password.trim(),
        confirmPassword: !!confirmPassword.trim(),
        idNumber: !!finalIdNumber,
        idNumberState: idNumber.trim(),
        identomatDataIdNumber: identomatData?.idNumber,
        isIdentomatVerified,
      });
      showToast.error(
        t("auth.register.validation.fillAll"),
        t("auth.register.error.default"),
      );
      return;
    }

    // Nationality is required for patients
    if (!isDoctor && nationality === null) {
      console.log("❌ [Register] Nationality validation failed for patient");
      showToast.error(
        t("auth.register.validation.fillAll"),
        t("auth.register.error.default"),
      );
      return;
    }

    // Phone is required for all users (doctors and patients)
    if (!phone.trim()) {
      console.log("❌ [Register] Phone validation failed:", {
        role: selectedRole,
        phone: phone.trim(),
      });
      showToast.error("ტელეფონის ნომერი აუცილებელია", "შეცდომა");
      return;
    }

    // Phone verification is required for all users
    if (!isPhoneVerified) {
      console.log("❌ [Register] Phone verification failed:", {
        phone: phone.trim(),
        isPhoneVerified,
      });
      showToast.error("გთხოვთ დადასტუროთ ტელეფონის ნომერი", "შეცდომა");
      return;
    }

    // Verification code is required for all users
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      console.log("❌ [Register] Verification code validation failed:", {
        verificationCode: verificationCode.trim(),
        length: verificationCode.trim().length,
      });
      showToast.error("გთხოვთ შეიყვანოთ ვერიფიკაციის კოდი", "შეცდომა");
      return;
    }

    if (!hasAcceptedTos) {
      console.log("❌ [Register] TOS acceptance validation failed");
      showToast.error(
        t("auth.register.tos.validationRequired"),
        t("auth.register.error.default"),
      );
      setTosModalVisible(true);
      return;
    }

    if (selectedRole === "doctor" && selectedSpecializations.length === 0) {
      console.log("❌ [Register] Specialization validation failed for doctor");
      showToast.error(
        t("auth.register.validation.specialization"),
        t("auth.register.error.default"),
      );
      return;
    }

    // Doctor specific required fields validation
    if (selectedRole === "doctor") {
      if (!degrees.trim()) {
        console.log("❌ [Register] Degrees validation failed for doctor");
        showToast.error("გთხოვთ შეიყვანოთ ხარისხი", "შეცდომა");
        return;
      }
      if (!experience.trim()) {
        console.log("❌ [Register] Experience validation failed for doctor");
        showToast.error("გთხოვთ შეიყვანოთ გამოცდილება", "შეცდომა");
        return;
      }
      if (!location.trim()) {
        console.log("❌ [Register] Location validation failed for doctor");
        showToast.error("გთხოვთ შეიყვანოთ მდებარეობა", "შეცდომა");
        return;
      }
      if (!dateOfBirth.trim()) {
        console.log("❌ [Register] Date of birth validation failed for doctor");
        showToast.error("გთხოვთ აირჩიოთ დაბადების თარიღი", "შეცდომა");
        return;
      }
      if (!about.trim()) {
        console.log(
          "❌ [Register] Working language validation failed for doctor",
        );
        showToast.error("გთხოვთ შეიყვანოთ სამუშაო ენა", "შეცდომა");
        return;
      }
    }

    if (password.length < 6) {
      console.log(
        "❌ [Register] Password length validation failed:",
        password.length,
      );
      showToast.error(
        t("auth.register.validation.passwordLength"),
        t("auth.register.error.default"),
      );
      return;
    }

    // Password confirmation validation
    if (password !== confirmPassword) {
      console.log("❌ [Register] Password confirmation validation failed");
      showToast.error("პაროლები არ ემთხვევა", "შეცდომა");
      return;
    }

    // IDENTOMAT verification is required for Georgian patients and all doctors
    if (
      (!isDoctor && nationality === "georgian" && !isIdentomatVerified) ||
      (isDoctor && !isIdentomatVerified)
    ) {
      console.log("❌ [Register] IDENTOMAT validation failed:", {
        isDoctor,
        nationality,
        isIdentomatVerified,
      });
      showToast.error("გთხოვთ გაიაროთ IDENTOMAT-ით იდენტიფიკაცია", "შეცდომა");
      return;
    }

    console.log("✅ [Register] All validations passed");

    try {
      setIsLoading(true);

      // Use finalIdNumber (from state or identomatData)
      const finalIdNumberForRegistration =
        idNumber.trim() ||
        (isIdentomatVerified && identomatData?.idNumber
          ? identomatData.idNumber
          : "");

      const registerData: any = {
        name: name.trim(),
        email: email.trim(),
        password,
        idNumber: finalIdNumberForRegistration,
        role: selectedRole,
        phone: phone.trim(), // Phone is required for all users
        verificationCode: verificationCode.trim(), // OTP code for phone verification
      };

      if (dateOfBirth && dateOfBirth.trim()) {
        registerData.dateOfBirth = dateOfBirth.trim();
      }
      if (gender) {
        registerData.gender = gender;
      }
      if (profileImage?.url) {
        registerData.profileImage = profileImage.url;
      }

      // Add patient specific fields
      if (selectedRole === "patient") {
        // Only add address if it's not empty
        if (address && address.trim()) {
          registerData.address = address.trim();
        }
        if (identificationDocument?.filePath) {
          registerData.identificationDocument = identificationDocument.filePath;
        }
        // Add Identomat images if available
        if (isIdentomatVerified && identomatData) {
          if (identomatData.faceImage) {
            registerData.identomatFaceImage = identomatData.faceImage;
          }
          if (identomatData.documentFrontImage) {
            registerData.identomatDocumentFrontImage =
              identomatData.documentFrontImage;
          }
          if (identomatData.documentBackImage) {
            registerData.identomatDocumentBackImage =
              identomatData.documentBackImage;
          }
          // Send full Identomat data for admin panel
          if (identomatData.fullData) {
            registerData.identomatFullData = identomatData.fullData;
          }
        }
      }

      // Add doctor specific fields
      if (selectedRole === "doctor") {
        if (selectedSpecializations.length > 0) {
          registerData.specialization = selectedSpecializations.join(", ");
        }
        if (licenseDocument?.filePath) {
          registerData.licenseDocument = licenseDocument.filePath;
        }
        if (identificationDocument?.filePath) {
          registerData.identificationDocument = identificationDocument.filePath;
        }
        // Add additional fields matching admin panel
        if (degrees && degrees.trim()) {
          registerData.degrees = degrees.trim();
        }
        if (experience && experience.trim()) {
          registerData.experience = experience.trim();
        }
        if (about && about.trim()) {
          registerData.about = about.trim();
        }
        if (location && location.trim()) {
          registerData.location = location.trim();
        }
      }

      console.log("📤 [Register] Final registration data (before API call):", {
        name: registerData.name,
        email: registerData.email,
        role: registerData.role,
        phone: registerData.phone,
        phoneLength: registerData.phone?.length,
        idNumber: registerData.idNumber,
        dateOfBirth: registerData.dateOfBirth,
        gender: registerData.gender,
        profileImage: registerData.profileImage ? "provided" : "not provided",
        address: registerData.address,
        identificationDocument: registerData.identificationDocument
          ? "provided"
          : "not provided",
        specialization: registerData.specialization,
        licenseDocument: registerData.licenseDocument
          ? "provided"
          : "not provided",
        degrees: registerData.degrees,
        experience: registerData.experience,
        about: registerData.about,
        location: registerData.location,
        hasPassword: !!registerData.password,
        passwordLength: registerData.password?.length,
        allKeys: Object.keys(registerData),
      });

      await register(registerData);

      // Show success toast
      showToast.auth.registerSuccess(name.trim());

      // Navigate based on role
      if (selectedRole === "doctor") {
        router.replace("/(doctor-tabs)");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("❌ [Register] Registration error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("auth.register.error.default");
      console.log("❌ [Register] Error message:", errorMessage);
      showToast.auth.registerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignin = () => {
    router.push("/screens/auth/login");
  };

  // Handle IDENTOMAT result
  const handleIdentomatResult = async () => {
    if (!identomatSessionToken) {
      console.error("❌ [IDENTOMAT] No session token available");
      return;
    }

    try {
      setIdentomatLoading(true);

      const COMPANY_KEY =
        "699c6dc7915fc8ed730c5034_0c1c01bb7b27253e3abe4d2ab9c573ff0ca5931f";

      // Step 3: Get IDENTOMAT result (basic data)
      const resultResponse = await fetch(
        "https://widget.identomat.com/external-api/result/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_key: COMPANY_KEY,
            session_token: identomatSessionToken,
          }),
        },
      );

      if (!resultResponse.ok) {
        throw new Error("IDENTOMAT შედეგის მიღება ვერ მოხერხდა");
      }

      const resultData = await resultResponse.json();
      console.log(
        "✅ [IDENTOMAT] Result data:",
        JSON.stringify(resultData, null, 2),
      );

      // Step 4: Get IDENTOMAT images using /result/card-front/ and /result/card-back/ endpoints
      // These endpoints return images directly (not JSON), so we need to upload them to Cloudinary
      let faceImage: string | null = null;
      let documentFrontImage: string | null = null;
      let documentBackImage: string | null = null;

      // Helper function to upload image blob to Cloudinary
      const uploadImageToCloudinary = async (
        imageBlob: Blob,
        imageName: string,
      ): Promise<string | null> => {
        try {
          // Convert blob to base64 for React Native
          const arrayBuffer = await imageBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);

          // Convert bytes to base64 string manually (works in both web and React Native)
          let binary = "";
          const chunkSize = 8192; // Process in chunks to avoid stack overflow
          for (let i = 0; i < bytes.byteLength; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }

          // Use btoa if available (web), otherwise use manual base64 encoding
          let base64String: string;
          if (typeof btoa !== "undefined") {
            base64String = btoa(binary);
          } else {
            // Manual base64 encoding for React Native
            const chars =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let result = "";
            let i = 0;
            while (i < binary.length) {
              const a = binary.charCodeAt(i++);
              const b = i < binary.length ? binary.charCodeAt(i++) : 0;
              const c = i < binary.length ? binary.charCodeAt(i++) : 0;
              const bitmap = (a << 16) | (b << 8) | c;
              result += chars.charAt((bitmap >> 18) & 63);
              result += chars.charAt((bitmap >> 12) & 63);
              result +=
                i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : "=";
              result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : "=";
            }
            base64String = result;
          }

          // Create FormData for Cloudinary upload
          const formData = new FormData();
          const dataUri = `data:image/jpeg;base64,${base64String}`;

          formData.append("file", {
            uri: dataUri,
            name: imageName,
            type: "image/jpeg",
          } as any);

          const uploadResponse = await fetch(
            `${apiService.getBaseURL()}/uploads/image/public`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            console.log(
              `✅ [IDENTOMAT] ${imageName} uploaded to Cloudinary:`,
              uploadData.url,
            );
            return uploadData.url || null;
          } else {
            const errorText = await uploadResponse.text();
            console.warn(
              `⚠️ [IDENTOMAT] Failed to upload ${imageName} to Cloudinary:`,
              uploadResponse.status,
              errorText,
            );
            return null;
          }
        } catch (error) {
          console.warn(
            `⚠️ [IDENTOMAT] Error uploading ${imageName} to Cloudinary:`,
            error,
          );
          return null;
        }
      };

      try {
        console.log(
          "📸 [IDENTOMAT] Requesting face, card-front and card-back images...",
        );
        const formData = new FormData();
        formData.append("company_key", COMPANY_KEY);
        formData.append("session_token", identomatSessionToken);

        // Step 1: Get face image first (ჯერ სახე)
        try {
          const faceResponse = await fetch(
            "https://widget.identomat.com/external-api/result/face/",
            {
              method: "POST",
              body: formData,
            },
          );

          if (faceResponse.ok) {
            const contentType = faceResponse.headers.get("content-type");
            if (contentType && contentType.startsWith("image/")) {
              const imageBlob = await faceResponse.blob();
              console.log(
                "✅ [IDENTOMAT] Face image received, uploading to Cloudinary...",
              );
              faceImage = await uploadImageToCloudinary(
                imageBlob,
                `identomat-face-${identomatSessionToken.substring(0, 10)}.jpg`,
              );
              console.log(
                "📸 [IDENTOMAT] Face image uploaded:",
                faceImage ? "success" : "failed",
              );
            }
          } else {
            console.warn(
              "⚠️ [IDENTOMAT] Face endpoint returned error:",
              faceResponse.status,
              faceResponse.statusText,
            );
          }
        } catch (faceError) {
          console.warn("⚠️ [IDENTOMAT] Failed to get face image:", faceError);
        }

        // Step 2: Get card front image (მერე წინა)
        try {
          const cardFrontResponse = await fetch(
            "https://widget.identomat.com/external-api/result/card-front/",
            {
              method: "POST",
              body: formData,
            },
          );

          if (cardFrontResponse.ok) {
            const contentType = cardFrontResponse.headers.get("content-type");
            if (contentType && contentType.startsWith("image/")) {
              // Response is an image, convert to blob and upload to Cloudinary
              const imageBlob = await cardFrontResponse.blob();
              console.log(
                "✅ [IDENTOMAT] Card front image received, uploading to Cloudinary...",
              );
              documentFrontImage = await uploadImageToCloudinary(
                imageBlob,
                `identomat-card-front-${identomatSessionToken.substring(0, 10)}.jpg`,
              );
              console.log(
                "📸 [IDENTOMAT] Card front image uploaded:",
                documentFrontImage ? "success" : "failed",
              );
            } else {
              // Response might be JSON with error
              const errorData = await cardFrontResponse
                .json()
                .catch(() => null);
              if (errorData?.argumentError) {
                console.warn(
                  "⚠️ [IDENTOMAT] Card front error:",
                  errorData.argumentError,
                );
              }
            }
          } else {
            console.warn(
              "⚠️ [IDENTOMAT] Card front endpoint returned error:",
              cardFrontResponse.status,
              cardFrontResponse.statusText,
            );
          }
        } catch (cardFrontError) {
          console.warn(
            "⚠️ [IDENTOMAT] Failed to get card front image:",
            cardFrontError,
          );
        }

        // Step 3: Get card back image (მერე უკანა)
        try {
          const cardBackResponse = await fetch(
            "https://widget.identomat.com/external-api/result/card-back/",
            {
              method: "POST",
              body: formData,
            },
          );

          if (cardBackResponse.ok) {
            const contentType = cardBackResponse.headers.get("content-type");
            if (contentType && contentType.startsWith("image/")) {
              // Response is an image, convert to blob and upload to Cloudinary
              const imageBlob = await cardBackResponse.blob();
              console.log(
                "✅ [IDENTOMAT] Card back image received, uploading to Cloudinary...",
              );
              documentBackImage = await uploadImageToCloudinary(
                imageBlob,
                `identomat-card-back-${identomatSessionToken.substring(0, 10)}.jpg`,
              );
              console.log(
                "📸 [IDENTOMAT] Card back image uploaded:",
                documentBackImage ? "success" : "failed",
              );
            } else {
              // Response might be JSON with error
              const errorData = await cardBackResponse.json().catch(() => null);
              if (errorData?.argumentError) {
                console.warn(
                  "⚠️ [IDENTOMAT] Card back error:",
                  errorData.argumentError,
                );
              }
            }
          } else {
            console.warn(
              "⚠️ [IDENTOMAT] Card back endpoint returned error:",
              cardBackResponse.status,
              cardBackResponse.statusText,
            );
          }
        } catch (cardBackError) {
          console.warn(
            "⚠️ [IDENTOMAT] Failed to get card back image:",
            cardBackError,
          );
        }
      } catch (imageError) {
        console.warn(
          "⚠️ [IDENTOMAT] Failed to get images from Identomat endpoints, falling back to result data:",
          imageError,
        );
      }

      // Extract data from IDENTOMAT response
      // According to Identomat API docs: https://docs.identomat.com/developer-tools/api-reference
      // The response contains a 'person' object with the extracted data
      const person = resultData.person || resultData;

      // Try to get personal_number from person object first, then fallback to root level
      const idNumber =
        person.personal_number ||
        person.id_number ||
        person.person_number ||
        resultData.personal_number ||
        resultData.id_number ||
        resultData.person_number ||
        resultData.idNumber;

      // Try to get name from person object first, then fallback to root level
      const firstName =
        person.first_name ||
        person.firstName ||
        person.name?.first ||
        resultData.first_name ||
        resultData.firstName ||
        resultData.name?.first;
      const lastName =
        person.last_name ||
        person.lastName ||
        person.name?.last ||
        resultData.last_name ||
        resultData.lastName ||
        resultData.name?.last;

      // Try to get date of birth from person object first, then fallback to root level
      // Identomat returns birthday in format like "5/15/1985" or ISO format
      const dateOfBirth =
        person.birthday ||
        person.birthday_time ||
        person.date_of_birth ||
        person.dateOfBirth ||
        person.dob ||
        resultData.date_of_birth ||
        resultData.dateOfBirth ||
        resultData.dob ||
        resultData.birthday;

      if (idNumber) {
        // Populate form fields with IDENTOMAT data
        setIdNumber(idNumber);

        if (firstName && lastName) {
          setName(`${firstName} ${lastName}`);
        } else if (firstName) {
          setName(firstName);
        }

        if (dateOfBirth) {
          setDateOfBirth(dateOfBirth);
          try {
            const dob = new Date(dateOfBirth);
            if (!isNaN(dob.getTime())) {
              setSelectedDate(dob);
            }
          } catch (e) {
            console.warn(
              "⚠️ [IDENTOMAT] Could not parse date of birth:",
              dateOfBirth,
            );
          }
        }

        setIsIdentomatVerified(true);
        // Ensure idNumber is set in state for validation
        if (idNumber) {
          setIdNumber(idNumber);
        }

        // If images were not found from face-document endpoint, try to extract from result data
        if (!faceImage) {
          faceImage =
            person.face_image ||
            person.face_image_url ||
            resultData.face_image ||
            resultData.face_image_url ||
            null;
        }
        if (!documentFrontImage) {
          documentFrontImage =
            person.document_front_image ||
            person.document_front_image_url ||
            resultData.document_front_image ||
            resultData.document_front_image_url ||
            null;
        }
        if (!documentBackImage) {
          documentBackImage =
            person.document_back_image ||
            person.document_back_image_url ||
            resultData.document_back_image ||
            resultData.document_back_image_url ||
            null;
        }

        console.log("📸 [IDENTOMAT] Final extracted images:", {
          hasFaceImage: !!faceImage,
          hasDocumentFrontImage: !!documentFrontImage,
          hasDocumentBackImage: !!documentBackImage,
        });

        setIdentomatData({
          idNumber,
          firstName,
          lastName,
          dateOfBirth,
          faceImage,
          documentFrontImage,
          documentBackImage,
          fullData: resultData,
        });

        showToast.success(
          "IDENTOMAT-ით იდენტიფიკაცია წარმატებით დასრულდა",
          "წარმატება",
        );

        // Close modal after short delay
        setTimeout(() => {
          setShowIdentomatModal(false);
          setIdentomatUrl("");
          setIdentomatSessionToken("");
        }, 1500);
      } else {
        throw new Error("IDENTOMAT-ის შედეგში ID ნომერი ვერ მოიძებნა");
      }
    } catch (error) {
      console.error("❌ [IDENTOMAT] Error getting result:", error);
      Alert.alert(
        "შეცდომა",
        error instanceof Error
          ? error.message
          : "IDENTOMAT-ის შედეგის მიღება ვერ მოხერხდა",
      );
    } finally {
      setIdentomatLoading(false);
    }
  };

  const isDoctor = selectedRole === "doctor";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Image
                    source={require("../../../assets/images/logo/logo.png")}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {isDoctor
                ? t("auth.register.title.doctor")
                : t("auth.register.title.patient")}
            </Text>
            <Text style={styles.subtitle}>
              {isDoctor
                ? t("auth.register.subtitle.doctor")
                : t("auth.register.subtitle.patient")}
            </Text>

            {/* Role Switcher */}

            {/* Nationality Selection - Only for patients */}
            {!isDoctor && nationality === null && (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.register.nationality.label")}
                  </Text>
                  <View style={styles.nationalityContainer}>
                    <TouchableOpacity
                      style={[
                        styles.nationalityOption,
                        nationality === "georgian" &&
                          styles.nationalityOptionSelected,
                      ]}
                      onPress={() => setNationality("georgian")}
                    >
                      <Ionicons
                        name="flag-outline"
                        size={24}
                        color={
                          nationality === "georgian" ? "#06B6D4" : "#6B7280"
                        }
                      />
                      <Text
                        style={[
                          styles.nationalityText,
                          nationality === "georgian" &&
                            styles.nationalityTextSelected,
                        ]}
                      >
                        {t("auth.register.nationality.georgian")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.nationalityOption,
                        nationality === "non-georgian" &&
                          styles.nationalityOptionSelected,
                      ]}
                      onPress={() => setNationality("non-georgian")}
                    >
                      <Ionicons
                        name="globe-outline"
                        size={24}
                        color={
                          nationality === "non-georgian" ? "#06B6D4" : "#6B7280"
                        }
                      />
                      <Text
                        style={[
                          styles.nationalityText,
                          nationality === "non-georgian" &&
                            styles.nationalityTextSelected,
                        ]}
                      >
                        {t("auth.register.nationality.nonGeorgian")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Form */}
            {((!isDoctor && nationality !== null) || isDoctor) && (
              <View style={styles.form}>
                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.register.name.label")} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.inputWrapper}
                    onPress={() => nameInputRef.current?.focus()}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={nameInputRef}
                      style={styles.input}
                      placeholder={t("auth.register.name.placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      textContentType="none"
                      autoComplete="off"
                      autoCorrect={false}
                      keyboardType="default"
                    />
                  </TouchableOpacity>
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.register.email.label")} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.inputWrapper}
                    onPress={() => emailInputRef.current?.focus()}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={emailInputRef}
                      style={styles.input}
                      placeholder={t("auth.register.email.placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      textContentType="none"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                  </TouchableOpacity>
                </View>

                {/* ID Number Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>
                      {!isDoctor && nationality === "non-georgian"
                        ? t("auth.register.idNumber.label.passport")
                        : t("auth.register.idNumber.label")}{" "}
                      *
                    </Text>
                    {!isDoctor && nationality === "non-georgian" && (
                      <TouchableOpacity
                        onPress={() => setShowPassportInfoModal(true)}
                        style={styles.infoButton}
                      >
                        <Ionicons
                          name="information-circle"
                          size={20}
                          color="#06B6D4"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.idNumberRow}>
                    <TouchableOpacity
                      activeOpacity={1}
                      style={[styles.inputWrapper, styles.idNumberInputWrapper]}
                      onPress={() => idNumberInputRef.current?.focus()}
                    >
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={idNumberInputRef}
                        style={styles.input}
                        placeholder={
                          !isDoctor && nationality === "non-georgian"
                            ? t("auth.register.idNumber.placeholder.passport")
                            : t("auth.register.idNumber.placeholder")
                        }
                        placeholderTextColor="#9CA3AF"
                        value={idNumber}
                        onChangeText={setIdNumber}
                        textContentType="none"
                        autoComplete="off"
                        autoCorrect={false}
                        keyboardType="default"
                        editable={!isIdentomatVerified}
                      />
                    </TouchableOpacity>
                    {((!isDoctor && nationality === "georgian") ||
                      isDoctor) && (
                      <TouchableOpacity
                        style={[
                          styles.identomatButton,
                          identomatLoading && styles.identomatButtonDisabled,
                        ]}
                        onPress={async () => {
                          if (identomatLoading) return;

                          try {
                            setIdentomatLoading(true);

                            const COMPANY_KEY =
                              "699c6dc7915fc8ed730c5034_0c1c01bb7b27253e3abe4d2ab9c573ff0ca5931f";
                            const beginResponse = await fetch(
                              "https://widget.identomat.com/external-api/begin/",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  company_key: COMPANY_KEY,
                                  flags: {
                                    skip_agreement: true,
                                    skip_document: false,
                                    skip_face: false,
                                  },
                                  steps: [
                                    {
                                      type: "face",
                                      key: "face",
                                    },
                                    {
                                      type: "document",
                                      key: "document",
                                    },
                                  ],
                                }),
                              },
                            );

                            console.log(
                              "📨 [IDENTOMAT] Begin response status:",
                              beginResponse.status,
                              beginResponse.statusText,
                            );

                            if (!beginResponse.ok) {
                              const errorText = await beginResponse.text();
                              console.error(
                                "❌ [IDENTOMAT] Begin error response:",
                                errorText,
                              );
                              throw new Error(
                                `IDENTOMAT session-ის დაწყება ვერ მოხერხდა: ${beginResponse.status} ${beginResponse.statusText}`,
                              );
                            }

                            const beginData = await beginResponse.json();
                            console.log(
                              "✅ [IDENTOMAT] Begin response data:",
                              beginData,
                            );
                            console.log(
                              "✅ [IDENTOMAT] Response type:",
                              typeof beginData,
                            );

                            // API returns session token directly as a string, not as an object
                            let sessionToken: string;

                            if (typeof beginData === "string") {
                              // Response is a string (session token directly)
                              sessionToken = beginData;
                            } else if (
                              typeof beginData === "object" &&
                              beginData !== null
                            ) {
                              // Response is an object, try different possible field names
                              sessionToken =
                                beginData.session_token ||
                                beginData.sessionToken ||
                                beginData.token ||
                                beginData.data?.session_token ||
                                beginData.data?.token ||
                                "";
                            } else {
                              throw new Error(
                                `Unexpected response type: ${typeof beginData}`,
                              );
                            }

                            if (!sessionToken || sessionToken.trim() === "") {
                              console.error(
                                "❌ [IDENTOMAT] No session token in response. Response:",
                                beginData,
                              );
                              throw new Error(
                                `Session token-ის მიღება ვერ მოხერხდა. Response: ${JSON.stringify(beginData)}`,
                              );
                            }

                            console.log(
                              "✅ [IDENTOMAT] Session token received:",
                              sessionToken.substring(0, 20) + "...",
                            );

                            setIdentomatSessionToken(sessionToken);

                            // Step 2: Open WebView with session token
                            const widgetUrl = `https://widget.identomat.com/?session_token=${sessionToken}`;
                            setIdentomatUrl(widgetUrl);
                            setShowIdentomatModal(true);
                          } catch (error) {
                            console.error(
                              "❌ [IDENTOMAT] Error starting session:",
                              error,
                            );
                            Alert.alert(
                              "შეცდომა",
                              error instanceof Error
                                ? error.message
                                : "IDENTOMAT-ის იდენტიფიკაცია ვერ მოხერხდა",
                            );
                          } finally {
                            setIdentomatLoading(false);
                          }
                        }}
                        disabled={identomatLoading}
                      >
                        {identomatLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons
                              name="finger-print-outline"
                              size={20}
                              color="#FFFFFF"
                            />
                            <Text style={styles.identomatButtonText}>
                              IDENTOMAT
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  {isIdentomatVerified && (
                    <View style={styles.identomatSuccessContainer}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={styles.identomatSuccessText}>
                        IDENTOMAT-ით დადასტურებული
                      </Text>
                    </View>
                  )}

                  {/* Skip IDENTOMAT Button (Temporary for development) */}
                  {!isIdentomatVerified &&
                    !isDoctor &&
                    nationality === "georgian" && (
                      <TouchableOpacity
                        style={styles.skipIdentomatButton}
                        onPress={() => {
                          // Skip IDENTOMAT verification (temporary)
                          const placeholderIdNumber =
                            idNumber.trim() || "00000000000";
                          setIsIdentomatVerified(true);
                          // Set idNumber in state so validation passes
                          setIdNumber(placeholderIdNumber);
                          setIdentomatData({
                            idNumber: placeholderIdNumber,
                            firstName: name?.split(" ")[0] || "Skipped",
                            lastName:
                              name?.split(" ").slice(1).join(" ") || "User",
                            dateOfBirth: dateOfBirth || "2000-01-01",
                            fullData: {
                              message: "Identomat skipped for development",
                            },
                          });
                          showToast.info(
                            "IDENTOMAT-ის იდენტიფიკაცია გამოტოვებულია (დროებით)",
                            "ინფორმაცია",
                          );
                        }}
                      >
                        <Text style={styles.skipIdentomatButtonText}>
                          გამოტოვება (დროებით)
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>

                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.register.phone.label")} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.inputWrapper}
                    onPress={() => phoneInputRef.current?.focus()}
                  >
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.input}
                      placeholder={t("auth.register.phone.placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={phone}
                      onChangeText={setPhone}
                      textContentType="none"
                      autoComplete="off"
                      autoCorrect={false}
                      keyboardType="phone-pad"
                    />
                  </TouchableOpacity>

                  {/* Phone Verification Button */}
                  {!isPhoneVerified && phone.trim() && (
                    <TouchableOpacity
                      style={styles.verifyPhoneButton}
                      onPress={() => setShowOTPModal(true)}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={20}
                        color="#06B6D4"
                      />
                      <Text style={styles.verifyPhoneButtonText}>
                        ტელეფონის ვერიფიკაცია
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Verified Status */}
                  {isPhoneVerified && (
                    <View style={styles.verifiedContainer}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                      <Text style={styles.verifiedText}>
                        ტელეფონი დადასტურებულია
                      </Text>
                    </View>
                  )}
                </View>

                {/* Patient specific fields */}
                {!isDoctor && (
                  <>
                    {/* Gender Selection */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>სქესი *</Text>
                      <View style={styles.genderContainer}>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            gender === "male" && styles.genderOptionSelected,
                          ]}
                          onPress={() => setGender("male")}
                        >
                          <Ionicons
                            name="male"
                            size={20}
                            color={gender === "male" ? "#06B6D4" : "#6B7280"}
                          />
                          <Text
                            style={[
                              styles.genderText,
                              gender === "male" && styles.genderTextSelected,
                            ]}
                          >
                            კაცი
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            gender === "female" && styles.genderOptionSelected,
                          ]}
                          onPress={() => setGender("female")}
                        >
                          <Ionicons
                            name="female"
                            size={20}
                            color={gender === "female" ? "#06B6D4" : "#6B7280"}
                          />
                          <Text
                            style={[
                              styles.genderText,
                              gender === "female" && styles.genderTextSelected,
                            ]}
                          >
                            ქალი
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Address Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>მისამართი *</Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={styles.inputWrapper}
                        onPress={() => addressInputRef.current?.focus()}
                      >
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          ref={addressInputRef}
                          style={styles.input}
                          placeholder="შეიყვანეთ მისამართი"
                          placeholderTextColor="#9CA3AF"
                          value={address}
                          onChangeText={setAddress}
                          textContentType="none"
                          autoComplete="off"
                          autoCorrect={false}
                          keyboardType="default"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Date of Birth */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>დაბადების თარიღი *</Text>
                      <TouchableOpacity
                        style={styles.inputWrapper}
                        onPress={openDatePicker}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <Text
                          style={[
                            styles.input,
                            !dateOfBirth && styles.inputPlaceholder,
                          ]}
                        >
                          {dateOfBirth || "აირჩიეთ თარიღი"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Profile Image */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>პროფილის სურათი</Text>
                      <View style={styles.profileCard}>
                        <View style={styles.profilePreview}>
                          {profileImage?.uri ? (
                            <Image
                              source={{ uri: profileImage.uri }}
                              style={styles.profilePreviewImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.profilePlaceholder}>
                              <Ionicons
                                name="person-circle-outline"
                                size={36}
                                color="#9CA3AF"
                              />
                              <Text style={styles.profilePlaceholderText}>
                                პროფილის ფოტო
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.profileActions}>
                          <TouchableOpacity
                            style={[
                              styles.filePickerButton,
                              profileImage && styles.filePickerButtonActive,
                            ]}
                            onPress={handleProfileImagePick}
                            disabled={uploadingProfileImage}
                          >
                            <Ionicons
                              name={
                                profileImage
                                  ? "checkmark-circle"
                                  : "cloud-upload-outline"
                              }
                              size={20}
                              color={profileImage ? "#10B981" : "#9CA3AF"}
                              style={styles.inputIcon}
                            />
                            {uploadingProfileImage ? (
                              <View style={styles.uploadingContainer}>
                                <ActivityIndicator
                                  size="small"
                                  color="#06B6D4"
                                />
                                <Text style={styles.uploadingText}>
                                  სურათი იტვირთება...
                                </Text>
                              </View>
                            ) : (
                              <Text
                                style={[
                                  styles.filePickerText,
                                  profileImage && styles.filePickerTextActive,
                                ]}
                              >
                                {profileImage
                                  ? profileImage.name
                                  : "აირჩიე პროფილის სურათი"}
                              </Text>
                            )}
                            <Ionicons
                              name="image-outline"
                              size={20}
                              color="#9CA3AF"
                            />
                          </TouchableOpacity>
                          <Text style={styles.profileHint}>
                            დაშვებულია JPG/PNG/WebP • მაქს 5MB
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Identification Document */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>იდენტიფიკაციის დოკუმენტი</Text>
                      <TouchableOpacity
                        style={[
                          styles.filePickerButton,
                          identificationDocument &&
                            styles.filePickerButtonActive,
                        ]}
                        onPress={handleIdentificationDocumentPick}
                        disabled={uploadingIdentificationDocument}
                      >
                        <Ionicons
                          name={
                            identificationDocument
                              ? "checkmark-circle"
                              : "cloud-upload-outline"
                          }
                          size={20}
                          color={identificationDocument ? "#10B981" : "#9CA3AF"}
                          style={styles.inputIcon}
                        />
                        {uploadingIdentificationDocument ? (
                          <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color="#06B6D4" />
                            <Text style={styles.uploadingText}>
                              {t("doctor.license.uploading")}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.filePickerText,
                              identificationDocument &&
                                styles.filePickerTextActive,
                            ]}
                          >
                            {identificationDocument
                              ? identificationDocument.name
                              : "აირჩიე იდენტიფიკაციის დოკუმენტი"}
                          </Text>
                        )}
                        <Ionicons
                          name="document-attach-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                      {identificationDocument && (
                        <Text style={styles.fileHelper}>
                          დოკუმენტი წარმატებით აიტვირთა
                        </Text>
                      )}
                    </View>
                  </>
                )}

                {/* Doctor specific fields */}
                {isDoctor && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("doctor.specialization.label")} *
                      </Text>
                      {loadingSpecializations ? (
                        <View style={styles.specializationsLoading}>
                          <ActivityIndicator size="small" color="#06B6D4" />
                          <Text style={styles.specializationsLoadingText}>
                            {t("doctor.specialization.loading")}
                          </Text>
                        </View>
                      ) : specializations.length > 0 ? (
                        <>
                          <TouchableOpacity
                            style={styles.multiSelectButton}
                            onPress={() => setSpecializationModalVisible(true)}
                          >
                            <Ionicons
                              name="medical-outline"
                              size={20}
                              color="#06B6D4"
                              style={styles.multiSelectIcon}
                            />
                            <View style={styles.multiSelectTextContainer}>
                              <Text style={styles.multiSelectLabel}>
                                {t("doctor.specialization.selectPlaceholder")}
                              </Text>
                              <Text
                                style={[
                                  styles.multiSelectValue,
                                  selectedSpecializations.length === 0 &&
                                    styles.multiSelectPlaceholder,
                                ]}
                                numberOfLines={1}
                              >
                                {selectedSpecializations.length > 0
                                  ? selectedSpecializations.join(", ")
                                  : t("doctor.specialization.valuePlaceholder")}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-down"
                              size={18}
                              color="#9CA3AF"
                            />
                          </TouchableOpacity>
                          <Text style={styles.multiSelectHelper}>
                            {t("doctor.specialization.helper")}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.specializationsEmpty}>
                          {t("doctor.specialization.empty")}
                        </Text>
                      )}
                    </View>

                    {/* Degrees Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("doctor.degrees.label")} *
                      </Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={styles.inputWrapper}
                        onPress={() => degreesInputRef.current?.focus()}
                      >
                        <Ionicons
                          name="school-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          ref={degreesInputRef}
                          style={styles.input}
                          placeholder={t("doctor.degrees.placeholder")}
                          placeholderTextColor="#9CA3AF"
                          value={degrees}
                          onChangeText={setDegrees}
                          textContentType="none"
                          autoComplete="off"
                          autoCorrect={false}
                          keyboardType="default"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Experience Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("doctor.experience.label")} *
                      </Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={styles.inputWrapper}
                        onPress={() => experienceInputRef.current?.focus()}
                      >
                        <Ionicons
                          name="briefcase-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          ref={experienceInputRef}
                          style={styles.input}
                          placeholder={t("doctor.experience.placeholder")}
                          placeholderTextColor="#9CA3AF"
                          value={experience}
                          onChangeText={setExperience}
                          textContentType="none"
                          autoComplete="off"
                          autoCorrect={false}
                          keyboardType="default"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Location Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("doctor.location.label")} *
                      </Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={styles.inputWrapper}
                        onPress={() => locationInputRef.current?.focus()}
                      >
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          ref={locationInputRef}
                          style={styles.input}
                          placeholder={t("doctor.location.placeholder")}
                          placeholderTextColor="#9CA3AF"
                          value={location}
                          onChangeText={setLocation}
                          textContentType="none"
                          autoComplete="off"
                          autoCorrect={false}
                          keyboardType="default"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Date of Birth */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("doctor.dob.label")} *
                      </Text>
                      <TouchableOpacity
                        style={styles.inputWrapper}
                        onPress={openDatePicker}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <Text
                          style={[
                            styles.input,
                            !dateOfBirth && styles.inputPlaceholder,
                          ]}
                        >
                          {dateOfBirth || t("doctor.dob.placeholder")}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Gender Selection */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("doctor.gender.label")} *
                      </Text>
                      <View style={styles.genderContainer}>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            gender === "male" && styles.genderOptionSelected,
                          ]}
                          onPress={() => setGender("male")}
                        >
                          <Ionicons
                            name="male"
                            size={20}
                            color={gender === "male" ? "#06B6D4" : "#6B7280"}
                          />
                          <Text
                            style={[
                              styles.genderText,
                              gender === "male" && styles.genderTextSelected,
                            ]}
                          >
                            {t("doctor.gender.male")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            gender === "female" && styles.genderOptionSelected,
                          ]}
                          onPress={() => setGender("female")}
                        >
                          <Ionicons
                            name="female"
                            size={20}
                            color={gender === "female" ? "#06B6D4" : "#6B7280"}
                          />
                          <Text
                            style={[
                              styles.genderText,
                              gender === "female" && styles.genderTextSelected,
                            ]}
                          >
                            {t("doctor.gender.female")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Working Language Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("doctor.workingLanguage.label")} *
                      </Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={styles.inputWrapper}
                        onPress={() => aboutInputRef.current?.focus()}
                      >
                        <Ionicons
                          name="language-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          ref={aboutInputRef}
                          style={styles.input}
                          placeholder={t("doctor.workingLanguage.placeholder")}
                          placeholderTextColor="#9CA3AF"
                          value={about}
                          onChangeText={setAbout}
                          textContentType="none"
                          autoComplete="off"
                          autoCorrect={false}
                          keyboardType="default"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* License Document */}
                    <View style={styles.inputContainer}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={styles.label}>
                          {t("doctor.license.label")}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowLicenseInfoModal(true)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={20}
                            color="#06B6D4"
                          />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.filePickerButton,
                          licenseDocument && styles.filePickerButtonActive,
                        ]}
                        onPress={handleFilePick}
                        disabled={uploadingFile}
                      >
                        <Ionicons
                          name={
                            licenseDocument
                              ? "checkmark-circle"
                              : "cloud-upload-outline"
                          }
                          size={20}
                          color={licenseDocument ? "#10B981" : "#9CA3AF"}
                          style={styles.inputIcon}
                        />
                        {uploadingFile ? (
                          <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color="#06B6D4" />
                            <Text style={styles.uploadingText}>
                              {t("doctor.license.uploading")}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.filePickerText,
                              licenseDocument && styles.filePickerTextActive,
                            ]}
                          >
                            {licenseDocument
                              ? licenseDocument.name
                              : t("doctor.license.placeholder")}
                          </Text>
                        )}
                        <Ionicons
                          name="document-attach-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                      {licenseDocument && (
                        <Text style={styles.fileHelper}>
                          {t("doctor.license.success")}
                        </Text>
                      )}
                    </View>

                    {/* Identification Document */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>იდენტიფიკაციის დოკუმენტი</Text>
                      <TouchableOpacity
                        style={[
                          styles.filePickerButton,
                          identificationDocument &&
                            styles.filePickerButtonActive,
                        ]}
                        onPress={handleIdentificationDocumentPick}
                        disabled={uploadingIdentificationDocument}
                      >
                        <Ionicons
                          name={
                            identificationDocument
                              ? "checkmark-circle"
                              : "cloud-upload-outline"
                          }
                          size={20}
                          color={identificationDocument ? "#10B981" : "#9CA3AF"}
                          style={styles.inputIcon}
                        />
                        {uploadingIdentificationDocument ? (
                          <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color="#06B6D4" />
                            <Text style={styles.uploadingText}>
                              {t("doctor.license.uploading")}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.filePickerText,
                              identificationDocument &&
                                styles.filePickerTextActive,
                            ]}
                          >
                            {identificationDocument
                              ? identificationDocument.name
                              : "აირჩიე იდენტიფიკაციის დოკუმენტი"}
                          </Text>
                        )}
                        <Ionicons
                          name="document-attach-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                      {identificationDocument && (
                        <Text style={styles.fileHelper}>
                          დოკუმენტი წარმატებით აიტვირთა
                        </Text>
                      )}
                    </View>

                    {/* Profile Image (optional for doctors) */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>პროფილის სურათი</Text>
                      <View style={styles.profileCard}>
                        <View style={styles.profilePreview}>
                          {profileImage?.uri ? (
                            <Image
                              source={{ uri: profileImage.uri }}
                              style={styles.profilePreviewImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.profilePlaceholder}>
                              <Ionicons
                                name="person-circle-outline"
                                size={36}
                                color="#9CA3AF"
                              />
                              <Text style={styles.profilePlaceholderText}>
                                პროფილის ფოტო
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.profileActions}>
                          <TouchableOpacity
                            style={[
                              styles.filePickerButton,
                              profileImage && styles.filePickerButtonActive,
                            ]}
                            onPress={handleProfileImagePick}
                            disabled={uploadingProfileImage}
                          >
                            <Ionicons
                              name={
                                profileImage
                                  ? "checkmark-circle"
                                  : "cloud-upload-outline"
                              }
                              size={20}
                              color={profileImage ? "#10B981" : "#9CA3AF"}
                              style={styles.inputIcon}
                            />
                            {uploadingProfileImage ? (
                              <View style={styles.uploadingContainer}>
                                <ActivityIndicator
                                  size="small"
                                  color="#06B6D4"
                                />
                                <Text style={styles.uploadingText}>
                                  სურათი იტვირთება...
                                </Text>
                              </View>
                            ) : (
                              <Text
                                style={[
                                  styles.filePickerText,
                                  profileImage && styles.filePickerTextActive,
                                ]}
                              >
                                {profileImage
                                  ? profileImage.name
                                  : "აირჩიე პროფილის სურათი"}
                              </Text>
                            )}
                            <Ionicons
                              name="image-outline"
                              size={20}
                              color="#9CA3AF"
                            />
                          </TouchableOpacity>
                          <Text style={styles.profileHint}>
                            დაშვებულია JPG/PNG/WebP • მაქს 5MB
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.register.password.label")} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.inputWrapper}
                    onPress={() => passwordInputRef.current?.focus()}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.input}
                      secureTextEntry={!showPassword}
                      placeholder={t("auth.register.password.placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      textContentType="none"
                      autoComplete="off"
                      autoCorrect={false}
                      keyboardType="default"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.register.confirmPassword.label")} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.inputWrapper}
                    onPress={() => confirmPasswordInputRef.current?.focus()}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={confirmPasswordInputRef}
                      style={styles.input}
                      secureTextEntry={!showPassword}
                      placeholder={t(
                        "auth.register.confirmPassword.placeholder",
                      )}
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      textContentType="none"
                      autoComplete="off"
                      autoCorrect={false}
                      keyboardType="default"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>

                {/* Terms of Service / Privacy Policy notice + checkbox */}
                <View style={styles.tosInlineContainer}>
                  <Text style={styles.tosInlineText}>
                    {t("auth.register.tos.inlineText") + " "}
                    <Text
                      style={styles.tosInlineLink}
                      onPress={() => setTosModalVisible(true)}
                    >
                      {t("auth.register.tos.readMore")}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.tosCheckboxRow}
                    onPress={() => {
                      const next = !hasAcceptedTos;
                      setHasAcceptedTos(next);
                      if (next) {
                        setTosModalVisible(true);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.tosCheckbox,
                        hasAcceptedTos && styles.tosCheckboxChecked,
                      ]}
                    >
                      {hasAcceptedTos && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.tosCheckboxLabel}>
                      {t("auth.register.tos.checkboxLabel")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Signup Button */}
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    isLoading && styles.signupButtonDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={isLoading}
                >
                  <Text style={styles.signupButtonText}>
                    {isLoading
                      ? t("auth.register.submitting")
                      : t("auth.register.submit")}
                  </Text>
                </TouchableOpacity>

                {/* Signin Link */}
                <View style={styles.signinContainer}>
                  <Text style={styles.signinText}>
                    {t("auth.register.signin.question")}
                  </Text>
                  <TouchableOpacity onPress={handleSignin}>
                    <Text style={styles.signinLink}>
                      {t("auth.register.signin.action")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Passport Info Modal - Only for non-Georgian patients */}
      {!isDoctor && (
        <Modal
          visible={showPassportInfoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPassportInfoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("auth.register.passportInfo.title")}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPassportInfoModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <View style={styles.passportInfoContainer}>
                  <Ionicons
                    name="information-circle"
                    size={32}
                    color="#06B6D4"
                    style={styles.passportInfoIcon}
                  />
                  <Text style={styles.passportInfoText}>
                    {t("auth.register.passportInfo.message")}
                  </Text>
                </View>
              </View>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={() => setShowPassportInfoModal(false)}
                  style={styles.modalPrimaryButton}
                >
                  <Text style={styles.modalPrimaryButtonText}>
                    {t("auth.register.passportInfo.ok")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Terms of Service / Privacy Policy modal */}
      <Modal
        visible={tosModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTosModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("auth.register.tos.title")}
              </Text>
              <TouchableOpacity
                onPress={() => setTosModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              <Text style={styles.tosModalDescription}>
                {t("auth.register.tos.description")}
              </Text>
              {/* აქ შეგიძლია შემდეგში ჩაანაცვლო რეალური ტექსტით ან HTML-rendered დოკუმენტით */}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={specializationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSpecializationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("doctor.specialization.modalTitle")}
              </Text>
              <TouchableOpacity
                onPress={() => setSpecializationModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {specializations.map((spec) => {
                const isSelected = selectedSpecializations.includes(spec.name);
                return (
                  <TouchableOpacity
                    key={spec._id}
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedSpecializations((prev) =>
                        prev.includes(spec.name)
                          ? prev.filter((name) => name !== spec.name)
                          : [...prev, spec.name],
                      );
                    }}
                  >
                    <View style={styles.modalItemInfo}>
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {spec.name}
                      </Text>
                      {spec.description ? (
                        <Text style={styles.modalItemDescription}>
                          {spec.description}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalPrimaryButton,
                selectedSpecializations.length === 0 &&
                  styles.modalPrimaryButtonDisabled,
              ]}
              onPress={() => setSpecializationModalVisible(false)}
              disabled={selectedSpecializations.length === 0}
            >
              <Text style={styles.modalPrimaryButtonText}>
                {t("doctor.specialization.modalDone")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModalContainer}>
              <View style={styles.datePickerModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerCancelButton}
                >
                  <Text style={styles.datePickerCancelText}>
                    {t("doctor.dob.modalCancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerDoneButton}
                >
                  <Text style={styles.datePickerDoneText}>
                    {t("doctor.dob.modalDone")}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* License Info Modal */}
      <Modal
        visible={showLicenseInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLicenseInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                სამედიცინო ლიცენზიის ატვირთვის ინფორმაცია
              </Text>
            </View>
            <ScrollView style={styles.modalList}>
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <Ionicons name="warning-outline" size={24} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Poppins-SemiBold",
                        color: "#92400E",
                        marginBottom: 8,
                      }}
                    >
                      მნიშვნელოვანი ინფორმაცია
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Poppins-Regular",
                        color: "#78350F",
                        lineHeight: 20,
                      }}
                    >
                      ლიცენზია იტვირთება მხოლოდ ერთხელ. გთხოვთ, ყურადღებით
                      შეამოწმოთ არჩეული ფაილი სანამ ატვირთვას დააწყებთ. შეცდომის
                      შემთხვევაში ლიცენზიის შეცვლა შესაძლებელი იქნება მხოლოდ
                      ადმინისტრატორის მხარდაჭერით.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: 20,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              <TouchableOpacity
                onPress={() => setShowLicenseInfoModal(false)}
                style={styles.modalPrimaryButton}
              >
                <Text style={styles.modalPrimaryButtonText}>გასაგებია</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* IDENTOMAT Modal */}
      <Modal
        visible={showIdentomatModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setShowIdentomatModal(false);
          setIdentomatUrl("");
        }}
      >
        <SafeAreaView style={styles.identomatModalContainer}>
          <View style={styles.identomatModalHeader}>
            <Text style={styles.identomatModalTitle}>
              IDENTOMAT იდენტიფიკაცია
            </Text>
            <TouchableOpacity
              onPress={async () => {
                // If modal is closed, try to get result before closing
                if (identomatSessionToken) {
                  await handleIdentomatResult();
                }
                setShowIdentomatModal(false);
                setIdentomatUrl("");
                setIdentomatSessionToken("");
              }}
              style={styles.identomatCloseButton}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
          {identomatUrl ? (
            <WebView
              source={{ uri: identomatUrl }}
              style={styles.identomatWebView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              allowsInlineMediaPlayback
              onLoadStart={() => {
                console.log(
                  "🔄 [IDENTOMAT] WebView load started:",
                  identomatUrl,
                );
              }}
              onLoadEnd={() => {
                console.log("✅ [IDENTOMAT] WebView load ended");
              }}
              onLoadProgress={({ nativeEvent }) => {
                console.log(
                  "📊 [IDENTOMAT] WebView load progress:",
                  Math.round(nativeEvent.progress * 100) + "%",
                );
              }}
              onNavigationStateChange={async (navState: WebViewNavigation) => {
                // Handle IDENTOMAT callback
                const url = navState.url;
                console.log("🔍 [IDENTOMAT] Navigation URL:", url);
                console.log("🔍 [IDENTOMAT] Navigation state:", {
                  url: navState.url,
                  title: navState.title,
                  loading: navState.loading,
                  canGoBack: navState.canGoBack,
                  canGoForward: navState.canGoForward,
                });

                // Check if IDENTOMAT process is complete (URL contains success indicators)
                if (
                  url.includes("success") ||
                  url.includes("complete") ||
                  url.includes("finished")
                ) {
                  // Wait a bit for IDENTOMAT to finalize, then get result
                  setTimeout(async () => {
                    await handleIdentomatResult();
                  }, 2000);
                }
              }}
              onError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                console.error("❌ [IDENTOMAT] WebView error:", nativeEvent);
                console.error(
                  "❌ [IDENTOMAT] Error details:",
                  JSON.stringify(nativeEvent, null, 2),
                );
                Alert.alert(
                  "შეცდომა",
                  `IDENTOMAT-ის ჩატვირთვა ვერ მოხერხდა: ${nativeEvent.description || nativeEvent.message || "უცნობი შეცდომა"}`,
                );
              }}
              onHttpError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                console.error("❌ [IDENTOMAT] HTTP error:", nativeEvent);
                console.error(
                  "❌ [IDENTOMAT] HTTP error status:",
                  nativeEvent.statusCode,
                );
                Alert.alert(
                  "HTTP შეცდომა",
                  `IDENTOMAT-ის სერვერთან დაკავშირება ვერ მოხერხდა: ${nativeEvent.statusCode || "უცნობი"}`,
                );
              }}
              onMessage={(event: any) => {
                console.log(
                  "📨 [IDENTOMAT] WebView message:",
                  event.nativeEvent.data,
                );
              }}
              renderError={(
                errorDomain: string | undefined,
                errorCode: number,
                errorDesc: string,
              ) => {
                console.error("❌ [IDENTOMAT] WebView render error:", {
                  errorDomain,
                  errorCode,
                  errorDesc,
                });
                return (
                  <View style={styles.identomatErrorContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={48}
                      color="#EF4444"
                    />
                    <Text style={styles.identomatErrorText}>შეცდომა</Text>
                    <Text style={styles.identomatErrorDescription}>
                      {errorDesc || "ვერ ჩაიტვირთა"}
                    </Text>
                    <TouchableOpacity
                      style={styles.identomatRetryButton}
                      onPress={() => {
                        // Reload WebView
                        setIdentomatUrl("");
                        setTimeout(() => {
                          setIdentomatUrl(identomatUrl);
                        }, 100);
                      }}
                    >
                      <Text style={styles.identomatRetryButtonText}>
                        ხელახლა სცადე
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          ) : (
            <View style={styles.identomatLoadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.identomatLoadingText}>იტვირთება...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* OTP Verification Modal */}
      <OTPModal
        visible={showOTPModal}
        phone={phone}
        onClose={() => setShowOTPModal(false)}
        onVerified={handleOTPVerified}
        title="ტელეფონის ვერიფიკაცია"
        subtitle="გთხოვთ შეიყვანოთ 6-ნიშნა კოდი, რომელიც გამოგიგზავნეთ SMS-ით"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  roleSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: "#06B6D4",
  },
  roleButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 15,
  },
  requiredLabel: {
    color: "#EF4444",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  label: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
  infoIconButton: {
    padding: 4,
  },
  nationalityContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  nationalityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  nationalityOptionSelected: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0FDFA",
  },
  nationalityText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  nationalityTextSelected: {
    color: "#06B6D4",
    fontFamily: "Poppins-SemiBold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  multiSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multiSelectIcon: {
    marginRight: 12,
  },
  multiSelectTextContainer: {
    flex: 1,
  },
  multiSelectLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 2,
  },
  multiSelectValue: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  multiSelectPlaceholder: {
    color: "#9CA3AF",
    fontFamily: "Poppins-Regular",
  },
  multiSelectHelper: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  eyeIcon: {
    padding: 4,
  },
  signupButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  signupButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginHorizontal: 16,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  facebookIcon: {
    backgroundColor: "#1877F2",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  signinText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  signinLink: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  tosInlineContainer: {
    marginBottom: 12,
  },
  tosInlineText: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 14,
  },
  tosInlineLink: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
    textDecorationLine: "underline",
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderStyle: "dashed",
  },
  filePickerButtonActive: {
    borderColor: "#10B981",
    borderStyle: "solid",
    backgroundColor: "#F0FDF4",
  },
  filePickerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  filePickerTextActive: {
    color: "#10B981",
    fontFamily: "Poppins-Medium",
  },
  uploadingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uploadingText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#06B6D4",
    marginLeft: 8,
  },
  fileHelper: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#10B981",
    marginTop: 4,
    marginLeft: 4,
  },
  profileCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  profilePreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePreviewImage: {
    width: "100%",
    height: "100%",
  },
  profilePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  profilePlaceholderText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  profileActions: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  profileHint: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  specializationsLoading: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  specializationsLoadingText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  specializationsEmpty: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  modalCloseButton: {
    marginRight: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    paddingVertical: 20,
  },
  modalFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  passportInfoContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  passportInfoIcon: {
    marginBottom: 16,
  },
  passportInfoText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 24,
  },
  modalList: {
    marginBottom: 20,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalItemSelected: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  modalItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  modalItemTextSelected: {
    color: "#0EA5E9",
  },
  modalItemDescription: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CBD5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  modalPrimaryButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  tosModalDescription: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
    lineHeight: 16,
  },
  tosCheckboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  tosCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  tosCheckboxChecked: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  tosCheckboxLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
    lineHeight: 14,
  },
  tosModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  tosModalSecondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  tosModalSecondaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  genderContainer: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
  },
  genderOptionSelected: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0F9FF",
  },
  genderText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  genderTextSelected: {
    color: "#06B6D4",
  },
  textAreaWrapper: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
  },
  textArea: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  inputPlaceholder: {
    color: "#9CA3AF",
  },
  idNumberRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  idNumberInputWrapper: {
    flex: 1,
  },
  identomatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: "center",
  },
  identomatButtonDisabled: {
    opacity: 0.6,
  },
  identomatButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  identomatSuccessContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
  },
  identomatSuccessText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#065F46",
  },
  skipIdentomatButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  skipIdentomatButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  identomatModalContainer: {
    flex: 1,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
  },
  identomatModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  identomatModalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  identomatCloseButton: {
    padding: 4,
  },
  identomatWebView: {
    flex: 1,
  },
  identomatLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  identomatLoadingText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  identomatErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  identomatErrorText: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  identomatErrorDescription: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  identomatRetryButton: {
    marginTop: 8,
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  identomatRetryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  datePickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  datePickerCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  datePickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  datePicker: {
    width: "100%",
    height: 200,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  inputWrapperVerified: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  verificationContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  verificationInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  verificationCodeInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    textAlign: "center",
    letterSpacing: 4,
  },
  verifyButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  sendCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  sendCodeButtonDisabled: {
    opacity: 0.6,
  },
  sendCodeButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  verificationError: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#EF4444",
    marginTop: 4,
    textAlign: "center",
  },
  verifyPhoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  verifyPhoneButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
});
