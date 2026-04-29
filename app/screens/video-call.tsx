import { Ionicons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Dimensions,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AudioProfileType,
  AudioScenarioType,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  createAgoraRtcEngine,
} from "react-native-agora";
import { apiService } from "../_services/api";
import { setCallOverlayState } from "../utils/callOverlayStore";

/**
 * ვიდეო კონსულტაციის გვერდი - Agora Video SDK
 *
 * რეალური ვიდეო კონსულტაცია Agora SDK-ით
 */

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Keep screen awake during video call
  useKeepAwake("video-call");

  // Get parameters from navigation
  const appointmentId = (params.appointmentId ||
    params.consultationId) as string;
  const [remoteUserName, setRemoteUserName] = useState<string>(
    (params.patientName || params.doctorName || "მეორე მონაწილე") as string,
  );
  const [localUserName, setLocalUserName] = useState<string>("მე");

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
  const [isFrontCamera, setIsFrontCamera] = useState(true); // true = front camera, false = back camera
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [connectionState, setConnectionState] =
    useState<string>("disconnected");
  const [channelClosed, setChannelClosed] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );

  const engineRef = useRef<IRtcEngine | null>(null);
  const tokenExpirationCheckRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const loadAgoraTokenRef = useRef<(() => Promise<void>) | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasVideoEnabledBeforeBackgroundRef = useRef<boolean>(isVideoEnabled);

  useEffect(() => {
    const resolveCallParticipantNames = async () => {
      try {
        if (!appointmentId) return;

        const [currentUser, appointmentResponse] = await Promise.all([
          apiService.getCurrentUser(),
          apiService.getAppointmentById(appointmentId),
        ]);

        const appointment = appointmentResponse?.data || {};
        const doctor = appointment.doctorId || {};
        const patient = appointment.patientId || {};
        const doctorId = String(doctor?._id || doctor?.id || appointment.doctorId || "");
        const patientId = String(
          patient?._id || patient?.id || appointment.patientId || "",
        );
        const doctorName =
          typeof doctor?.name === "string" && doctor.name.trim()
            ? doctor.name.trim()
            : "";
        const patientName =
          typeof patient?.name === "string" && patient.name.trim()
            ? patient.name.trim()
            : "";
        const myId = String(currentUser?.id || "");

        if (myId && myId === doctorId) {
          setLocalUserName(doctorName || "მე");
          setRemoteUserName(patientName || "მეორე მონაწილე");
          return;
        }

        if (myId && myId === patientId) {
          setLocalUserName(patientName || "მე");
          setRemoteUserName(doctorName || "მეორე მონაწილე");
          return;
        }

        const fallbackRemote = (params.patientName ||
          params.doctorName ||
          doctorName ||
          patientName ||
          "მეორე მონაწილე") as string;
        setRemoteUserName(fallbackRemote);
      } catch (err) {
        console.warn("Failed to resolve call participant names:", err);
      }
    };

    resolveCallParticipantNames();
  }, [appointmentId, params.doctorName, params.patientName]);

  const recoverMediaAfterInterruption = useCallback(async () => {
    if (!engineRef.current || !isJoined) return;

    try {
      await engineRef.current.enableAudio();
      await engineRef.current.setEnableSpeakerphone(true);
      await engineRef.current.muteLocalAudioStream(isMuted);
      const shouldEnableVideo = wasVideoEnabledBeforeBackgroundRef.current;
      await engineRef.current.enableLocalVideo(shouldEnableVideo);
      await engineRef.current.muteLocalVideoStream(!shouldEnableVideo);
      console.log("Media recovered after interruption");
    } catch (err) {
      console.error("Failed to recover media after interruption:", err);
    }
  }, [isJoined, isMuted]);

  useEffect(() => {
    wasVideoEnabledBeforeBackgroundRef.current = isVideoEnabled;
  }, [isVideoEnabled]);

  // Allow free rotation only on video call screen
  useEffect(() => {
    const enableVideoCallRotation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.ALL,
        );
      } catch (err) {
        console.warn("Failed to unlock screen orientation:", err);
      }
    };

    enableVideoCallRotation();

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch((err) => {
        console.warn("Failed to restore portrait orientation:", err);
      });
    };
  }, []);

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

  const initializeAgora = useCallback(
    async (data: {
      token: string;
      channelName: string;
      appId: string;
      uid: number;
      expirationTime: number;
    }) => {
      try {
        const engine = createAgoraRtcEngine();
        await engine.initialize({ appId: data.appId });
        engineRef.current = engine;

        await engine.enableVideo();

        await engine.enableAudio();

        // Configure audio for low latency
        // Use low latency audio profile for real-time communication
        try {
          await engine.setAudioProfile(
            AudioProfileType.AudioProfileDefault,
            AudioScenarioType.AudioScenarioGameStreaming, // Low latency scenario for real-time communication
          );
        } catch {
          console.log("setAudioProfile not available, using defaults");
        }

        // Configure audio for background mode and call interruption handling
        if (Platform.OS === "ios") {
          // iOS: Enable audio session for background and prevent interruption
          await engine.setDefaultAudioRouteToSpeakerphone(true);
          await engine.setEnableSpeakerphone(true);
          // Try to set audio session restrictions to prevent interruption
          try {
            // This helps keep audio active even when phone call comes in
            await (engine as any).setAudioSessionOperationRestriction?.(0);
          } catch {
            console.log("setAudioSessionOperationRestriction not available");
          }
        } else {
          // Android: Configure audio for background and low latency
          await engine.setDefaultAudioRouteToSpeakerphone(true);
          await engine.setEnableSpeakerphone(true);
          // Android automatically handles call interruption better than iOS
        }

        await engine.setChannelProfile(
          ChannelProfileType.ChannelProfileCommunication,
        );

        await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

        engine.addListener(
          "onJoinChannelSuccess",
          (connection: any, elapsed: number) => {
            console.log("Joined channel successfully:", connection, elapsed);
            setIsJoined(true);
            // Keep awake is already active via useKeepAwake hook
          },
        );

        engine.addListener(
          "onUserJoined",
          (connection: any, remoteUid: number, elapsed: number) => {
            console.log("Remote user joined:", remoteUid);
            setRemoteUid(remoteUid);
          },
        );

        engine.addListener(
          "onUserOffline",
          (connection: any, remoteUid: number, reason: number) => {
            console.log("Remote user offline:", remoteUid, reason);
            setRemoteUid(null);
          },
        );

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
          // Keep awake will be automatically deactivated when component unmounts
        });

        // Channel-ის დახურვის შემოწმება connection state-ის მეშვეობით
        engine.addListener(
          "onConnectionStateChanged",
          (connection: any, state: number, reason: number) => {
            const stateNames: { [key: number]: string } = {
              1: "disconnected",
              2: "connecting",
              3: "connected",
              4: "reconnecting",
              5: "failed",
            };

            const stateName = stateNames[state] || "unknown";
            setConnectionState(stateName);

            if (state === 1 || state === 5) {
              if (appStateRef.current !== "active") {
                console.log(
                  "Ignoring disconnect while app inactive/background",
                  appStateRef.current,
                );
                return;
              }
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
                ],
              );
            }
          },
        );

        // Token-ის expiration-ის შემოწმება
        engine.addListener(
          "onTokenPrivilegeWillExpire",
          (connection: any, token: string) => {
            console.log("Token will expire soon, refreshing...", token);
            if (loadAgoraTokenRef.current) {
              loadAgoraTokenRef.current();
            }
          },
        );

        // Connection-ის დაკარგვის შემოწმება
        engine.addListener("onConnectionLost", () => {
          console.log("Connection lost");
          if (appStateRef.current !== "active") {
            console.log(
              "Ignoring connection lost while app inactive/background",
              appStateRef.current,
            );
            return;
          }
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
            ],
          );
        });

        // Set initial orientation before joining channel
        const { width, height } = Dimensions.get("window");
        const isLandscape = width > height;
        const initialOrientation = isLandscape ? "landscape" : "portrait";
        setOrientation(initialOrientation);

        // Set device orientation in Agora SDK
        try {
          const orientationValue = isLandscape ? 90 : 0;
          await (engine as any).setDeviceOrientation?.(orientationValue);
        } catch {
          console.log(
            "setDeviceOrientation not available during initialization",
          );
        }

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
            const checkTime = Math.max(
              timeUntilExpiration - 5 * 60 * 1000,
              60000,
            );

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
    },
    [router],
  );

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
            granted[PermissionsAndroid.PERMISSIONS.CAMERA] !==
              PermissionsAndroid.RESULTS.GRANTED ||
            granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !==
              PermissionsAndroid.RESULTS.GRANTED
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

  // Handle app state changes for background audio and call interruption
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(
        "App state changed:",
        appStateRef.current,
        "->",
        nextAppState,
      );

      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground (e.g., after rejecting incoming call)
        console.log("App came to foreground, ensuring audio is active");
        if (engineRef.current && isJoined) {
          wasVideoEnabledBeforeBackgroundRef.current = isVideoEnabled;
          // Recover aggressively after interruption because iOS may drop audio session
          recoverMediaAfterInterruption();
          setTimeout(() => {
            recoverMediaAfterInterruption();
          }, 300);
          setTimeout(() => {
            recoverMediaAfterInterruption();
          }, 1200);
        }
      } else if (
        appStateRef.current === "active" &&
        nextAppState === "inactive"
      ) {
        // App went to inactive (e.g., incoming call notification shown)
        console.log(
          "App went to inactive (possibly incoming call), maintaining audio connection",
        );
        // Don't disconnect - keep audio running
        // This is like WhatsApp - call continues even when system call UI shows
        if (engineRef.current && isJoined) {
          // Keep audio session warm; avoid route loss after incoming phone call UI
          wasVideoEnabledBeforeBackgroundRef.current = isVideoEnabled;
          engineRef.current.enableAudio();
          engineRef.current.enableLocalVideo(false);
          engineRef.current.muteLocalVideoStream(true);
          engineRef.current.setEnableSpeakerphone(true);
        }
      } else if (
        appStateRef.current === "active" &&
        nextAppState === "background"
      ) {
        // App went to background
        console.log("App went to background, maintaining audio connection");
        // Don't disable audio - keep it running in background
        if (engineRef.current && isJoined) {
          wasVideoEnabledBeforeBackgroundRef.current = isVideoEnabled;
          engineRef.current.enableAudio();
          engineRef.current.enableLocalVideo(false);
          engineRef.current.muteLocalVideoStream(true);
          engineRef.current.setEnableSpeakerphone(true);
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [isJoined, isVideoEnabled, recoverMediaAfterInterruption]);

  useEffect(() => {
    if (!appointmentId) {
      setError("Appointment ID is missing");
      setLoading(false);
      return;
    }

    loadAgoraToken();

    return () => {
      setCallOverlayState({ visible: false });
      // Cleanup on unmount
      if (tokenExpirationCheckRef.current) {
        clearTimeout(tokenExpirationCheckRef.current);
        tokenExpirationCheckRef.current = null;
      }

      // Keep awake will be automatically deactivated when component unmounts

      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
    };
  }, [appointmentId, loadAgoraToken]);

  // Orientation-ის განახლება და Agora SDK-ში დაყენება
  const updateOrientation = useCallback(async () => {
    if (!engineRef.current) return;

    const { width, height } = Dimensions.get("window");
    const isLandscape = width > height;
    const newOrientation = isLandscape ? "landscape" : "portrait";

    if (newOrientation !== orientation) {
      setOrientation(newOrientation);

      try {
        // Agora SDK-ს აქვს setDeviceOrientation მეთოდი orientation-ის დასაყენებლად
        // Orientation values: 0 = portrait, 90 = landscape right, 180 = portrait upside down, 270 = landscape left
        const orientationValue = isLandscape ? 90 : 0;

        // Try to set device orientation in Agora SDK
        try {
          await (engineRef.current as any).setDeviceOrientation?.(
            orientationValue,
          );
        } catch {
          // If setDeviceOrientation is not available, try alternative method
          console.log("setDeviceOrientation not available, trying alternative");
        }

        // Also try to update video encoder configuration with orientation
        try {
          await (engineRef.current as any).setVideoEncoderConfiguration?.({
            orientationMode: isLandscape ? 1 : 0, // 0 = portrait, 1 = landscape
          });
        } catch {
          console.log("setVideoEncoderConfiguration not available");
        }
      } catch (err) {
        console.error("Error updating orientation:", err);
      }
    }
  }, [orientation]);

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
          ],
        );
      }
    }, 5000);

    return () => {
      clearInterval(statusCheckInterval);
    };
  }, [isJoined, channelClosed, checkChannelStatus, loadAgoraToken, router]);

  // Orientation-ის მონიტორინგი
  useEffect(() => {
    if (!isJoined || !engineRef.current) return;

    // Initial orientation check
    updateOrientation();

    // Listen for dimension changes (orientation changes)
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      const isLandscape = window.width > window.height;
      const newOrientation = isLandscape ? "landscape" : "portrait";

      if (newOrientation !== orientation) {
        updateOrientation();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [isJoined, orientation, updateOrientation]);

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
      const nextEnabled = !isVideoEnabled;
      await engineRef.current.enableLocalVideo(nextEnabled);
      await engineRef.current.muteLocalVideoStream(!nextEnabled);
      setIsVideoEnabled(nextEnabled);
    } catch (err) {
      console.error("Error toggling video:", err);
    }
  };

  const switchCamera = async () => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  };

  const handleEndCall = async () => {
    setCallOverlayState({ visible: false });
    const channelStatus = checkChannelStatus();

    if (channelStatus.isClosed) {
      console.log("Channel already closed:", channelStatus.reason);
      // Keep awake will be automatically deactivated when component unmounts
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
            setCallOverlayState({ visible: false });
            // Keep awake will be automatically deactivated when component unmounts
            router.back();
          },
        },
      ],
    );
  };

  const handleMinimizeCall = () => {
    setCallOverlayState({
      visible: true,
      appointmentId,
      remoteUserName,
    });
    router.push("/(tabs)");
  };

  const handleExpandCall = () => {
    setIsMiniMode(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            ვიდეო კონსულტაციის მომზადება...
          </Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={loadAgoraToken}>
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

  if (isMiniMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.miniModeWrapper}>
          <View style={styles.miniVideoCard}>
            {remoteUid !== null && engineRef.current ? (
              <RtcSurfaceView
                canvas={{ uid: remoteUid }}
                style={styles.miniRemoteVideo}
              />
            ) : (
              <View style={styles.miniWaitingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.miniWaitingText}>მოლოდინი...</Text>
              </View>
            )}

            {engineRef.current && isVideoEnabled && (
              <View style={styles.miniLocalVideoContainer}>
                <RtcSurfaceView
                  canvas={{ uid: 0 }}
                  style={styles.miniLocalVideo}
                  zOrderMediaOverlay={true}
                />
              </View>
            )}

            <View style={styles.miniActions}>
              <TouchableOpacity
                style={styles.miniActionButton}
                onPress={handleExpandCall}
              >
                <Ionicons name="expand" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniActionButton, styles.miniEndButton]}
                onPress={handleEndCall}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
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
        <TouchableOpacity
          style={styles.minimizeButton}
          onPress={handleMinimizeCall}
        >
          <Ionicons name="remove" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.videoContainer}>
        {/* Remote video - always show full screen when available */}
        {remoteUid !== null && engineRef.current && (
          <View style={styles.remoteVideoContainer}>
            <RtcSurfaceView
              canvas={{ uid: remoteUid }}
              style={styles.remoteVideo}
            />
          </View>
        )}

        {/* Local video - show as small overlay only when video is enabled */}
        {engineRef.current && isVideoEnabled && (
          <View style={styles.localVideoContainer}>
            <RtcSurfaceView
              canvas={{ uid: 0 }}
              style={styles.localVideo}
              zOrderMediaOverlay={true}
            />
          </View>
        )}

        {/* Local video placeholder - show only when video is disabled AND remote user is connected */}
        {engineRef.current && !isVideoEnabled && remoteUid !== null && (
          <View style={styles.localVideoPlaceholderContainer}>
            <View style={styles.videoPlaceholder}>
              <Ionicons name="person" size={24} color="#9CA3AF" />
              <Text style={styles.placeholderTextSmall}>{localUserName}</Text>
            </View>
          </View>
        )}

        {/* Waiting for remote user */}
        {isJoined && remoteUid === null && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.waitingText}>
              {`${remoteUserName}-ს ველოდებით...`}
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
          style={[
            styles.controlButton,
            !isVideoEnabled && styles.controlButtonActive,
          ]}
          onPress={toggleVideo}
        >
          <Ionicons
            name={isVideoEnabled ? "videocam" : "videocam-off"}
            size={24}
            color={isVideoEnabled ? "#111827" : "#FFFFFF"}
          />
        </TouchableOpacity>

        {/* Camera switch button - only show when video is enabled */}
        {isVideoEnabled && (
          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Ionicons
              name={isFrontCamera ? "camera-reverse" : "camera"}
              size={24}
              color="#111827"
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
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
  minimizeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  miniModeWrapper: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 72,
    paddingRight: 16,
  },
  miniVideoCard: {
    width: 170,
    height: 250,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
  },
  miniRemoteVideo: {
    width: "100%",
    height: "100%",
  },
  miniWaitingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  miniWaitingText: {
    fontSize: 11,
    color: "#E5E7EB",
    fontFamily: "Poppins-Medium",
  },
  miniLocalVideoContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 52,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1F2937",
  },
  miniLocalVideo: {
    width: "100%",
    height: "100%",
  },
  miniActions: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  miniActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(31, 41, 55, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniEndButton: {
    backgroundColor: "#EF4444",
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
  localVideoPlaceholderContainer: {
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
  placeholderTextSmall: {
    marginTop: 4,
    fontSize: 9,
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
