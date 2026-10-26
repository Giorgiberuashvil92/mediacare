import AsyncStorage from "@react-native-async-storage/async-storage";

export const AI_CONSENT_VERSION = "1.1";
export const AI_CONSENT_STORAGE_KEY = "ai_data_consent";

export interface AIConsentRecord {
  accepted: boolean;
  version: string;
  acceptedAt: string;
}

export async function getAIConsent(): Promise<AIConsentRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(AI_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AIConsentRecord;
    if (parsed.version !== AI_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveAIConsent(accepted: boolean): Promise<AIConsentRecord> {
  const record: AIConsentRecord = {
    accepted,
    version: AI_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(AI_CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function hasAcceptedAIConsent(): Promise<boolean> {
  const record = await getAIConsent();
  return record?.accepted === true;
}
