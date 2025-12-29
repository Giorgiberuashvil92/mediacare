declare module 'agora-access-token' {
  export enum RtcRole {
    PUBLISHER = 1,
    SUBSCRIBER = 2,
  }

  export class RtcTokenBuilder {
    static buildTokenWithUid(
      appId: string,
      appCertificate: string,
      channelName: string,
      uid: number | string,
      role: RtcRole,
      privilegeExpiredTs: number,
    ): string;

    static buildTokenWithAccount(
      appId: string,
      appCertificate: string,
      channelName: string,
      account: string,
      role: RtcRole,
      privilegeExpiredTs: number,
    ): string;
  }
}
