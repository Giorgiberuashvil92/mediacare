import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

type MisLoginResponse = {
  code: number;
  message: string;
  value?: string;
};

type MisPatientPayload = {
  ID: string;
  PersonalID: string;
  FirstName: string;
  LastName: string;
  FatherName: string;
  Gender: number;
  BirthDate?: string;
  Phone: string;
  Mobile: string;
  Email: string;
  LegalAddress: string;
  ActualAddress: string;
  Description: string;
  IdentificationStatus: number;
  ConsentForm: boolean;
  Encrypted: boolean;
  UserID: string;
  UserFirstName: string;
  UserLastName: string;
  DateCreated: string;
  DateChanged: string;
  IsFromEMR: boolean;
};

type MisPatientUpsertResult = {
  success: boolean;
  personId?: string | null;
};

/** MIS პასუხიდან ID სტრიქონის ამოღება — ტიპიზაცია არა, მხოლოდ ხშირი ველები */
function tryPickPersonIdFromMisBody(parsed: unknown): string | null {
  const keys = [
    'PersonID',
    'personId',
    'EMRPersonID',
    'emrPersonId',
    'ID',
    'id',
  ];
  const fromObject = (o: Record<string, unknown>): string | null => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const root = parsed as Record<string, unknown>;
  const direct = fromObject(root);
  if (direct) {
    return direct;
  }
  const inner =
    root.data ?? root.Data ?? root.value ?? root.Value ?? root.Result;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return fromObject(inner as Record<string, unknown>);
  }
  return null;
}

@Injectable()
export class MisAuthService implements OnModuleInit {
  private readonly logger = new Logger(MisAuthService.name);

  private readonly loginUrl =
    process.env.MIS_AUTH_LOGIN_URL ||
    'http://185.247.94.160/MISNew/MIS.Authentication/MIS.Authentication.API/api/Home/Login';
  private readonly loginName = process.env.MIS_AUTH_LOGIN_NAME || 'admin';
  private readonly password =
    process.env.MIS_AUTH_LOGIN_PASSWORD || 'MIS123456';
  private readonly loginTokenHeader = process.env.MIS_AUTH_LOGIN_TOKEN || '';
  private readonly patientUpsertUrl =
    process.env.MIS_PATIENT_UPSERT_URL ||
    'http://185.247.94.160/MISNew/MIS.Ambulatory/MIS.Ambulatory.API/api/Patients/AddOrUpdatePatient';

  private storedValue: string | null = null;
  private lastResponse: MisLoginResponse | null = null;

  async onModuleInit(): Promise<void> {
    await this.refreshLoginToken();
  }

  async refreshLoginToken(): Promise<MisLoginResponse | null> {
    const url = new URL(this.loginUrl);
    url.searchParams.set('loginName', this.loginName);
    url.searchParams.set('password', this.password);

    try {
      this.logger.log(
        `Calling MIS login on app init: ${url.origin}${url.pathname}`,
      );

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          LoginToken: this.loginTokenHeader,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `MIS login failed: ${response.status} ${response.statusText} | ${body}`,
        );
        return null;
      }

      const data = (await response.json()) as MisLoginResponse;
      this.lastResponse = data;

      if (typeof data.value === 'string' && data.value.trim()) {
        this.storedValue = data.value.trim();
        this.logger.log('MIS login value stored successfully');
      } else {
        this.logger.warn('MIS login response has no value to store');
      }

      this.logger.log(
        `MIS login response code=${data.code} message="${data.message}"`,
      );
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MIS login request error: ${message}`);
      return null;
    }
  }

  getStoredValue(): string | null {
    return this.storedValue;
  }

  getLastResponse(): MisLoginResponse | null {
    return this.lastResponse;
  }

  async upsertPatient(
    payload: MisPatientPayload,
  ): Promise<MisPatientUpsertResult> {
    let loginToken = this.getStoredValue();
    if (!loginToken) {
      await this.refreshLoginToken();
      loginToken = this.getStoredValue();
    }

    if (!loginToken) {
      this.logger.error('Cannot upsert MIS patient: LoginToken is empty');
      return { success: false, personId: null };
    }

    try {
      this.logger.log(
        `MIS patient upsert request | url=${this.patientUpsertUrl} | hasLoginToken=${Boolean(loginToken)}`,
      );
      this.logger.log(`MIS patient upsert payload: ${JSON.stringify(payload)}`);

      const response = await fetch(this.patientUpsertUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          LoginToken: loginToken,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      this.logger.log(
        `MIS AddOrUpdatePatient ← HTTP ${response.status} ${response.statusText} | RAW BODY:\n${responseText}`,
      );

      if (!response.ok) {
        return { success: false, personId: null };
      }

      let parsed: unknown;
      const trimmed = responseText.trim();
      if (trimmed) {
        try {
          parsed = JSON.parse(trimmed) as unknown;
          this.logger.log(
            `MIS AddOrUpdatePatient ← PARSED (რასაც API დააბრუნებს):\n${JSON.stringify(parsed, null, 2)}`,
          );
        } catch {
          this.logger.warn(
            `MIS AddOrUpdatePatient: ტექსტი JSON არ არის (პირველი 800 სიმბოლო): ${trimmed.slice(0, 800)}`,
          );
          parsed = undefined;
        }
      } else {
        parsed = undefined;
      }

      const personId = tryPickPersonIdFromMisBody(parsed);

      this.logger.log(
        `MIS AddOrUpdatePatient ← ამოღებული personId ველიდან (თუ იყო): ${personId ?? '(არ ვიპოვე — ზემოთ RAW/PARSED ნახე)'} | ჩვენი PersonalID=${payload.PersonalID}`,
      );
      return { success: true, personId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MIS patient upsert request error: ${message}`);
      return { success: false, personId: null };
    }
  }
}
