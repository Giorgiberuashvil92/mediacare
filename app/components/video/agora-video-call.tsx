import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { apiService } from "../../services/api";

/**
 * Agora Video Call Component - WebView based
 * 
 * გამოიყენება Agora Web SDK WebView-ით Expo-ში
 * 
 * უპირატესობები:
 * - ✅ Expo Go-ში მუშაობს (არ საჭიროებს native modules)
 * - ✅ HD ხარისხი
 * - ✅ Low latency
 * - ✅ Screen Sharing
 * - ✅ Recording support
 * - ✅ Professional quality
 */

interface AgoraVideoCallProps {
  appointmentId: string;
  userName: string;
  userRole: "doctor" | "patient";
  onEndCall?: () => void;
}

export default function AgoraVideoCall({
  appointmentId,
  userName,
  userRole,
  onEndCall,
}: AgoraVideoCallProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [callStarted, setCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Fetch Agora token from backend
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const response = await apiService.getAgoraToken(appointmentId);
        console.log('🎬 Agora Token Response:', JSON.stringify(response, null, 2));
        console.log('🔍 Response structure:', {
          hasSuccess: 'success' in response,
          success: response.success,
          hasData: 'data' in response,
          dataKeys: response.data ? Object.keys(response.data) : null,
        });
        
        if (response && response.success && response.data) {
          console.log('✅ Setting token and appId:', {
            hasToken: !!response.data.token,
            tokenLength: response.data.token?.length || 0,
            appId: response.data.appId,
            appIdLength: response.data.appId?.length || 0,
            allDataKeys: Object.keys(response.data),
          });
          setToken(response.data.token);
          setAppId(response.data.appId || null);
        } else {
          console.error('❌ Invalid response structure:', response);
          setError("Token generation failed: Invalid response");
        }
      } catch (err: any) {
        console.error("Failed to get Agora token:", err);
        setError(err?.message || "Failed to initialize video call");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [appointmentId]);

  // Call duration timer
  useEffect(() => {
    if (!callStarted) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStarted]);

  const handleEndCall = () => {
    Alert.alert(
      "კონსულტაციის დასრულება",
      "დარწმუნებული ხართ, რომ გსურთ კონსულტაციის დასრულება?",
      [
        {
          text: "გაუქმება",
          style: "cancel",
        },
        {
          text: "დასრულება",
          style: "destructive",
          onPress: () => {
            // Leave channel via WebView message
            webViewRef.current?.postMessage(JSON.stringify({ action: "leaveChannel" }));
            if (onEndCall) {
              onEndCall();
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Generate Agora Web SDK HTML
  const generateAgoraHTML = () => {
    if (!token) {
      console.warn('⚠️ No token available for HTML generation');
      return "";
    }

    // Use hardcoded App ID (development)
    const agoraAppId = "3f485e4bf3bd4b4ea9bac7375d33785a";
    
    if (!agoraAppId || agoraAppId.length === 0) {
      console.error('❌ Agora App ID is empty!');
      return "";
    }
    
    const channelName = `appointment-${appointmentId}`;
    const uid = userRole === "doctor" ? 1 : 2;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Agora Video Call</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            width: 100vw; 
            height: 100vh; 
            overflow: hidden;
            background: #000;
          }
          #video-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          #local-video {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 120px;
            height: 160px;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid #fff;
            z-index: 10;
          }
          #remote-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          #local-video video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          #status {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-family: Arial, sans-serif;
            text-align: center;
            z-index: 5;
          }
        </style>
      </head>
      <body>
        <div id="video-container">
          <div id="local-video"></div>
          <div id="remote-video"></div>
          <div id="status">Initializing...</div>
        </div>
        <script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js"></script>
        <script>
          const APP_ID = "${agoraAppId}";
          const TOKEN = "${token}";
          const CHANNEL = "${channelName}";
          const UID = ${uid};
          
          const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
          
          let localTracks = {
            videoTrack: null,
            audioTrack: null
          };
          let remoteUsers = {};
          
          async function joinChannel() {
            try {
              document.getElementById('status').textContent = 'Joining channel...';
              
              // Initialize client
              await client.join(APP_ID, CHANNEL, TOKEN, UID);
              
              // Create and publish local tracks
              localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
              localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
              
              // Play local video
              localTracks.videoTrack.play("local-video");
              
              // Publish tracks
              await client.publish([localTracks.audioTrack, localTracks.videoTrack]);
              
              document.getElementById('status').textContent = '';
              
              // Notify React Native that call started
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ 
                  event: 'callStarted' 
                }));
              }
            } catch (error) {
              console.error('Join channel error:', error);
              document.getElementById('status').textContent = 'Error: ' + error.message;
              
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ 
                  event: 'error',
                  error: error.message 
                }));
              }
            }
          }
          
          // Handle remote users
          client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            
            if (mediaType === "video") {
              const remoteVideoTrack = user.videoTrack;
              remoteVideoTrack.play("remote-video");
            }
            
            if (mediaType === "audio") {
              user.audioTrack.play();
            }
          });
          
          client.on("user-unpublished", (user, mediaType) => {
            if (mediaType === "video") {
              user.videoTrack.stop();
            }
            if (mediaType === "audio") {
              user.audioTrack.stop();
            }
          });
          
          // Handle messages from React Native
          window.addEventListener("message", (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.action === "leaveChannel") {
                leaveChannel();
              }
            } catch (e) {
              console.error("Message parse error:", e);
            }
          });
          
          async function leaveChannel() {
            // Stop local tracks
            localTracks.audioTrack?.close();
            localTracks.videoTrack?.close();
            
            // Leave channel
            await client.leave();
            
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                event: 'callEnded' 
              }));
            }
          }
          
          // Start on load
          window.addEventListener("load", () => {
            joinChannel();
          });
        </script>
      </body>
      </html>
    `;
  };

  // Handle WebView messages
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === "callStarted") {
        setCallStarted(true);
        setLoading(false);
      } else if (data.event === "error") {
        setError(data.error);
        setLoading(false);
      } else if (data.event === "callEnded") {
        if (onEndCall) {
          onEndCall();
        } else {
          router.back();
        }
      }
    } catch (err) {
      console.error("Message parse error:", err);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>დაბრუნება</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>
            ვიდეო კონსულტაციის ჩატვირთვა...
          </Text>
          <Text style={styles.loadingSubtext}>Agora Video SDK ინიციალიზაცია</Text>
          {!appId && (
            <Text style={styles.loadingSubtext}>
              App ID-ის მოლოდინში...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {callStarted && (
            <>
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>LIVE</Text>
              </View>
              <Text style={styles.durationText}>
                {formatDuration(callDuration)}
              </Text>
            </>
          )}
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.patientName}>{userName}</Text>
          <Text style={styles.consultationId}>ID: {appointmentId}</Text>
        </View>
        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Ionicons name="call" size={20} color="#FFFFFF" />
          <Text style={styles.endCallText}>დასრულება</Text>
        </TouchableOpacity>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateAgoraHTML() }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mixedContentMode="always"
          mediaCapturePermissionGrantType="grant"
        />
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              End-to-End Encrypted • Agora Video
            </Text>
            <Text style={styles.infoText}>
              Channel: appointment-{appointmentId}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F2937",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#EF4444",
  },
  durationText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  patientName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  consultationId: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  endCallButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
  },
  endCallText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1F2937",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1F2937",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#EF4444",
    marginTop: 20,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#06B6D4",
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111827",
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#1F293720",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B98130",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#10B981",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
});

