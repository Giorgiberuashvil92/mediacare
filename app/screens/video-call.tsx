import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    PermissionsAndroid,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import RtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcSurfaceView
} from "react-native-agora";
import { apiService } from "../services/api";

/**
 * ვიდეო კონსულტაციის გვერდი - Agora Video SDK
 * 
 * რეალური ვიდეო კონსულტაცია Agora SDK-ით
 */

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get parameters from navigation
  const appointmentId = (params.appointmentId || params.consultationId) as string;
  const userName = (params.patientName || params.doctorName || "User") as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<{
    token: string;
    channelName: string;
    appId: string;
    uid: number;
    expirationTime: number;
  } | null>(null);
  
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<string>("disconnected");
  const [channelClosed, setChannelClosed] = useState(false);
  
  const engineRef = useRef<IRtcEngine | null>(null);
  const tokenExpirationCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadAgoraTokenRef = useRef<(() => Promise<void>) | null>(null);

  // Channel-ის დახურვის შემოწმება
  const checkChannelStatus = useCallback(() => {
    if (!engineRef.current) {
      return { isClosed: true, reason: "Engine not initialized" };
    }

    // Connection state-ის შემოწმება
    if (connectionState === "disconnected" || connectionState === "failed") {
      return { isClosed: true, reason: `Connection ${connectionState}` };
    }

    // Channel closed state-ის შემოწმება
    if (channelClosed) {
      return { isClosed: true, reason: "Channel closed" };
    }

    // Token expiration-ის შემოწმება
    if (agoraData?.expirationTime) {
      const expirationTimeMs = agoraData.expirationTime * 1000;
      const currentTime = Date.now();
      if (currentTime >= expirationTimeMs) {
        return { isClosed: true, reason: "Token expired" };
      }
    }

    return { isClosed: false, reason: null };
  }, [connectionState, channelClosed, agoraData]);

  const initializeAgora = useCallback(async (data: {
    token: string;
    channelName: string;
    appId: string;
    uid: number;
    expirationTime: number;
  }) => {
    try {
      const engine = RtcEngine();
      await engine.initialize({ appId: data.appId });
      engineRef.current = engine;

      await engine.enableVideo();
      
      await engine.enableAudio();

      await engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      engine.addListener("onJoinChannelSuccess", (connection: any, elapsed: number) => {
        console.log("Joined channel successfully:", connection, elapsed);
        setIsJoined(true);
      });

      engine.addListener("onUserJoined", (connection: any, remoteUid: number, elapsed: number) => {
        console.log("Remote user joined:", remoteUid);
        setRemoteUid(remoteUid);
      });

      engine.addListener("onUserOffline", (connection: any, remoteUid: number, reason: number) => {
        console.log("Remote user offline:", remoteUid, reason);
        setRemoteUid(null);
      });

      engine.addListener("onError", (err: number, msg: string) => {
        console.error("Agora error:", err, msg);
        setError(`Agora error: ${msg}`);
      });

      engine.addListener("onLeaveChannel", () => {
        console.log("Left channel");
        setIsJoined(false);
        setRemoteUid(null);
        setChannelClosed(true);
        setConnectionState("disconnected");
      });

      // Channel-ის დახურვის შემოწმება connection state-ის მეშვეობით
      engine.addListener("onConnectionStateChanged", (
        connection: any,
        state: number,
        reason: number
      ) => {
        const stateNames: { [key: number]: string } = {
          1: "disconnected",
          2: "connecting",
          3: "connected",
          4: "reconnecting",
          5: "failed",
        };
        
        const stateName = stateNames[state] || "unknown";
        console.log("Connection state changed:", stateName, "reason:", reason);
        setConnectionState(stateName);

        // თუ connection-ი დაიხურა ან ვერ დაკავშირდა
        if (state === 1 || state === 5) { // disconnected ან failed
          setChannelClosed(true);
          setIsJoined(false);
          Alert.alert(
            "კავშირი დაკარგულია",
            "ვიდეო კონსულტაციის კავშირი დაიხურა. გსურთ ხელახლა შეერთება?",
            [
              {
                text: "დახურვა",
                style: "cancel",
                onPress: () => router.back(),
              },
              {
                text: "ხელახლა შეერთება",
                onPress: () => {
                  setChannelClosed(false);
                  if (loadAgoraTokenRef.current) {
                    loadAgoraTokenRef.current();
                  }
                },
              },
            ]
          );
        }
      });

      // Token-ის expiration-ის შემოწმება
      engine.addListener("onTokenPrivilegeWillExpire", (connection: any, token: string) => {
        console.log("Token will expire soon, refreshing...", token);
        if (loadAgoraTokenRef.current) {
          loadAgoraTokenRef.current();
        }
      });

      // Connection-ის დაკარგვის შემოწმება
      engine.addListener("onConnectionLost", () => {
        console.log("Connection lost");
        setChannelClosed(true);
        setIsJoined(false);
        Alert.alert(
          "კავშირი დაკარგულია",
          "ვიდეო კონსულტაციის კავშირი დაკარგულია. გსურთ ხელახლა შეერთება?",
          [
            {
              text: "დახურვა",
              style: "cancel",
              onPress: () => router.back(),
            },
            {
              text: "ხელახლა შეერთება",
              onPress: () => {
                setChannelClosed(false);
                if (loadAgoraTokenRef.current) {
                  loadAgoraTokenRef.current();
                }
              },
            },
          ]
        );
      });

      await engine.joinChannel(data.token, data.channelName, data.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      console.log("Agora initialized and joined channel");

      // Token expiration time-ის შემოწმება
      if (data.expirationTime) {
        const expirationTimeMs = data.expirationTime * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTimeMs - currentTime;
        
        // თუ token-ი უკვე გაუვიდა
        if (timeUntilExpiration <= 0) {
          console.log("Token already expired, refreshing...");
          if (loadAgoraTokenRef.current) {
            loadAgoraTokenRef.current();
          }
        } else {
          // Token-ის expiration-ის შემოწმება 5 წუთით ადრე
          const checkTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 60000); // მინიმუმ 1 წუთი
          
          if (tokenExpirationCheckRef.current) {
            clearTimeout(tokenExpirationCheckRef.current);
          }
          
          tokenExpirationCheckRef.current = setTimeout(() => {
            console.log("Token expiring soon, refreshing...");
            if (loadAgoraTokenRef.current) {
              loadAgoraTokenRef.current();
            }
          }, checkTime);
        }
      }
    } catch (err: any) {
      console.error("Error initializing Agora:", err);
      setError(`Failed to initialize Agora: ${err.message}`);
    }
  }, [router]);

  const loadAgoraToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === "android") {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          
          if (
            granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
            granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            throw new Error("Permissions not granted");
          }
        } catch (err) {
          console.error("Permission error:", err);
          throw err;
        }
      }

      const response = await apiService.getAgoraToken(appointmentId);

      if (response.success && response.data) {
        setAgoraData(response.data);
        await initializeAgora(response.data);
      } else {
        setError("Failed to get Agora token");
      }
    } catch (err: any) {
      console.error("Error loading Agora token:", err);
      setError(err.message || "Failed to load Agora token");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, initializeAgora]);

  // Set ref for loadAgoraToken to avoid circular dependency
  useEffect(() => {
    loadAgoraTokenRef.current = loadAgoraToken;
  }, [loadAgoraToken]);

  useEffect(() => {
    if (!appointmentId) {
      setError("Appointment ID is missing");
      setLoading(false);
      return;
    }

    loadAgoraToken();
    
    return () => {
      // Cleanup on unmount
      if (tokenExpirationCheckRef.current) {
        clearTimeout(tokenExpirationCheckRef.current);
        tokenExpirationCheckRef.current = null;
      }
      
      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
    };
  }, [appointmentId, loadAgoraToken]);

  // Channel-ის status-ის პერიოდული შემოწმება
  useEffect(() => {
    if (!isJoined || channelClosed) return;

    const statusCheckInterval = setInterval(() => {
      const status = checkChannelStatus();
      
      if (status.isClosed) {
        console.log("Channel closed detected:", status.reason);
        setChannelClosed(true);
        setIsJoined(false);
        
        Alert.alert(
          "კავშირი დაკარგულია",
          `ვიდეო კონსულტაციის კავშირი დაიხურა: ${status.reason}. გსურთ ხელახლა შეერთება?`,
          [
            {
              text: "დახურვა",
              style: "cancel",
              onPress: () => router.back(),
            },
            {
              text: "ხელახლა შეერთება",
              onPress: () => {
                setChannelClosed(false);
                if (loadAgoraTokenRef.current) {
                  loadAgoraTokenRef.current();
                }
              },
            },
          ]
        );
      }
    }, 5000); // შემოწმება ყოველ 5 წუთში

    return () => {
      clearInterval(statusCheckInterval);
    };
  }, [isJoined, channelClosed, checkChannelStatus, loadAgoraToken, router]);

  const toggleMute = async () => {
    if (!engineRef.current) return;
    
    try {
      await engineRef.current.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      console.error("Error toggling mute:", err);
    }
  };

  const toggleVideo = async () => {
    if (!engineRef.current) return;
    
    try {
      await engineRef.current.muteLocalVideoStream(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (err) {
      console.error("Error toggling video:", err);
    }
  };

  const handleEndCall = async () => {
    const channelStatus = checkChannelStatus();
    
    if (channelStatus.isClosed) {
      console.log("Channel already closed:", channelStatus.reason);
      router.back();
      return;
    }

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
          onPress: async () => {
            try {
              if (engineRef.current) {
                await engineRef.current.leaveChannel();
                engineRef.current.release();
                engineRef.current = null;
              }
              setChannelClosed(true);
            } catch (err) {
              console.error("Error leaving channel:", err);
            }
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>ვიდეო კონსულტაციის მომზადება...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>შეცდომა</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadAgoraToken}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>უკან დაბრუნება</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleEndCall}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>ვიდეო კონსულტაცია</Text>
          {isJoined && !channelClosed && (
            <Text style={styles.headerSubtitle}>
              {remoteUid ? "დაკავშირებული" : "მოლოდინი..."}
            </Text>
          )}
          {channelClosed && (
            <Text style={[styles.headerSubtitle, { color: "#EF4444" }]}>
              კავშირი დაკარგულია
            </Text>
          )}
          {connectionState === "reconnecting" && (
            <Text style={[styles.headerSubtitle, { color: "#F59E0B" }]}>
              ხელახლა შეერთება...
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.videoContainer}>
        {remoteUid !== null && engineRef.current && (
          <View style={styles.remoteVideoContainer}>
            <RtcSurfaceView
              canvas={{ uid: remoteUid }}
              style={styles.remoteVideo}
            />
          </View>
        )}

        {engineRef.current && (
          <View style={styles.localVideoContainer}>
            {isVideoEnabled ? (
              <RtcSurfaceView
                canvas={{ uid: 0 }}
                style={styles.localVideo}
                zOrderMediaOverlay={true}
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="person" size={32} color="#9CA3AF" />
                <Text style={styles.placeholderText}>{userName}</Text>
              </View>
            )}
          </View>
        )}

        {/* Waiting for remote user */}
        {isJoined && remoteUid === null && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.waitingText}>
              მოლოდინი სხვა მონაწილის შემოსვლის...
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic"}
            size={24}
            color={isMuted ? "#FFFFFF" : "#111827"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
          onPress={toggleVideo}
        >
          <Ionicons
            name={isVideoEnabled ? "videocam" : "videocam-off"}
            size={24}
            color={isVideoEnabled ? "#111827" : "#FFFFFF"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "Poppins-Medium",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
    backgroundColor: "#F9FAFB",
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1F2937",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  videoContainer: {
    flex: 1,
    position: "relative",
  },
  localVideoContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1F2937",
    zIndex: 10,
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1F2937",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#9CA3AF",
  },
  waitingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  waitingText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#1F2937",
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonActive: {
    backgroundColor: "#EF4444",
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
});
