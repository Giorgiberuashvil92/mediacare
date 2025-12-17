# Agora Video Call Integration Guide

## 1. Agora Account Setup

1. დარეგისტრირდით [Agora.io](https://www.agora.io/) - ზე
2. შექმენით ახალი Project
3. მიიღეთ:
   - **App ID**: გამოიყენება client-ში
   - **App Certificate**: გამოიყენება backend-ში token generation-ისთვის

## 2. Environment Variables

### Backend (.env):
```
AGORA_APP_ID=your_app_id_here
AGORA_APP_CERTIFICATE=your_app_certificate_here
```

### Frontend (app.json extra field):
`app.json`-ში `extra` field-ში დაამატე:
```json
{
  "expo": {
    "extra": {
      "agoraAppId": "your_app_id_here"
    }
  }
}
```

ან environment variable-ით:
```
EXPO_PUBLIC_AGORA_APP_ID=your_app_id_here
```

**შენიშვნა:** კოდი ავტომატურად ამოწმებს ორივე მეთოდს - პირველ რიგში `process.env.EXPO_PUBLIC_AGORA_APP_ID`, შემდეგ `app.json`-ის `extra.agoraAppId`.

## 3. Features

- ✅ HD Video & Audio
- ✅ Screen Sharing
- ✅ Mute/Unmute Audio
- ✅ Enable/Disable Video
- ✅ Switch Camera
- ✅ Call Duration Timer
- ✅ End-to-End Encryption
- ✅ Low Latency

## 4. Usage

```typescript
// Video call screen-ში
import { AgoraVideoCall } from '@/components/video/agora-video-call';

// Appointment ID-ით token-ს მოვითხოვთ backend-დან
const token = await apiService.getAgoraToken(appointmentId);
const channelName = `appointment-${appointmentId}`;

<AgoraVideoCall
  appId={AGORA_APP_ID}
  channel={channelName}
  token={token}
  uid={userId}
  onEndCall={() => router.back()}
/>
```

