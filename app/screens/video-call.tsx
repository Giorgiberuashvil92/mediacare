import { useLocalSearchParams, useRouter } from "expo-router";
import AgoraVideoCall from "../components/video/agora-video-call";
import { useAuth } from "../contexts/AuthContext";

/**
 * ვიდეო კონსულტაციის გვერდი - Agora Video SDK
 * 
 * გამოიყენება Agora Web SDK WebView-ით Expo-ში
 * 
 * უპირატესობები:
 * - ✅ Expo Go-ში მუშაობს
 * - ✅ HD ხარისხი
 * - ✅ Low latency
 * - ✅ Screen Sharing
 * - ✅ Recording support
 * - ✅ Professional quality
 */

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userRole } = useAuth();

  // Get parameters from navigation - support both consultationId and appointmentId
  const appointmentId = (params.appointmentId || params.consultationId) as string;
  const userName = (params.patientName || params.doctorName || "User") as string;
  
  // Determine user role - default to patient if not available
  const role = (userRole || "patient") as "doctor" | "patient";

  if (!appointmentId) {
    return null; // Or show error
  }

  return (
    <AgoraVideoCall
      appointmentId={appointmentId}
      userName={userName}
      userRole={role}
      onEndCall={() => router.back()}
    />
  );
}
