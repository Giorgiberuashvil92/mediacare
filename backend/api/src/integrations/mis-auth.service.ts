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

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `MIS patient upsert failed: ${response.status} ${response.statusText} | ${body}`,
        );
        return { success: false, personId: null };
      }

      const responseData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const personId =
        (typeof responseData.PersonID === 'string' && responseData.PersonID) ||
        (typeof responseData.personId === 'string' && responseData.personId) ||
        (typeof responseData.ID === 'string' && responseData.ID) ||
        (typeof responseData.id === 'string' && responseData.id) ||
        null;

      this.logger.log(
        `MIS patient upsert success for PersonalID=${payload.PersonalID}, PersonID=${personId ?? 'not returned'}`,
      );
      return { success: true, personId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MIS patient upsert request error: ${message}`);
      return { success: false, personId: null };
    }
  }
}
