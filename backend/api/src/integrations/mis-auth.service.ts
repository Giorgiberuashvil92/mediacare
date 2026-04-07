import { randomUUID } from 'crypto';
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

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const GUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidString(s: string): boolean {
  return GUID_REGEX.test(s.trim());
}

/**
 * MIS AddOrUpdatePatient სავარაუდოდ Guid-ს ელოდება ID/UserID-ზე.
 * Mongo ObjectId (24 ჰექსი) JSON → C# Guid-ზე ვერ იკითხება → მთელი მოდელი null („Model is null“).
 */
function misPatientIdsForRequest(payload: MisPatientPayload): {
  ID: string;
  UserID: string;
} {
  if (isUuidString(payload.ID)) {
    return {
      ID: payload.ID.trim(),
      UserID: isUuidString(payload.UserID)
        ? payload.UserID.trim()
        : payload.ID.trim(),
    };
  }
  const id = randomUUID();
  return { ID: id, UserID: id };
}

/** Swagger-ის სრული სხეული — ცარიელი Guid/default, რომ model binding არ ჩამორჩეს */
const MIS_ADD_OR_UPDATE_PATIENT_DEFAULTS: Record<string, unknown> = {
  LegalRegionID: EMPTY_GUID,
  LegalMunicipalityID: EMPTY_GUID,
  LegalSettlementID: EMPTY_GUID,
  ActualRegionID: EMPTY_GUID,
  ActualMunicipalityID: EMPTY_GUID,
  ActualSettlementID: EMPTY_GUID,
  WorkingPlace: '',
  Profession: '',
  Position: '',
  Convicted: false,
  Pregnant: false,
  BloodGroup: EMPTY_GUID,
  RHFactorType: EMPTY_GUID,
  MaritalStatusType: '',
  Citizenship: '',
  Diabetic: false,
  OtherIdentificationNumber: '',
  FamilyDoctorID: EMPTY_GUID,
  Comment: '',
  DateDeleted: null,
  AgeYears: 0,
  Attention: false,
  RepresentativePersonalID: '',
  RepresentativeLastName: '',
  RepresentativeFirstName: '',
  RepresentativeType: 0,
  RepresentativeMobile: '',
  RepresentativeEmail: '',
  EMRPersonID: EMPTY_GUID,
  BeneficiaryMainContigent: false,
  BeneficiaryProgramId: 0,
  BeneficiaryComponentName: '',
  BeneficiaryMedicalCardNumber: '',
  BeneficiarySSAPolicyTypeID: EMPTY_GUID,
  BeneficiarySSAPolicyTypeName: '',
};

function buildMisAddOrUpdateRequestBody(
  payload: MisPatientPayload,
): Record<string, unknown> {
  const ids = misPatientIdsForRequest(payload);
  return {
    ...MIS_ADD_OR_UPDATE_PATIENT_DEFAULTS,
    ...payload,
    ...ids,
  };
}

function misEnvelopeIndicatesFailure(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }
  const r = parsed as Record<string, unknown>;
  return r.result === false || r.Result === false;
}

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

type MisGenerateServicePayload = {
  ServiceID: string;
  PersonID: string;
  ContractID: string;
  MakeAutoPayment: boolean;
  DoctorPersonalID: string;
  ServiceDate: string;
};

export type MisGenerateServiceResult = {
  success: boolean;
  serviceId?: string | null;
};

/** GenerateService პასუხიდან ახალი სერვისის ID (ხშირად value სტრიქონი ან ობიექტი) */
function tryPickMisGeneratedServiceId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const r = parsed as Record<string, unknown>;
  const v = r.value ?? r.Value;
  if (typeof v === 'string' && v.trim()) {
    return v.trim();
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    for (const k of ['ID', 'id', 'ServiceID', 'serviceId']) {
      const x = o[k];
      if (typeof x === 'string' && x.trim()) {
        return x.trim();
      }
    }
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
  private readonly generateServiceUrl =
    process.env.MIS_GENERATE_SERVICE_URL ||
    'http://185.247.94.160/MISNew/MIS.Ambulatory/MIS.Ambulatory.API/api/Services/GenerateService';

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
      const requestBody = buildMisAddOrUpdateRequestBody(payload);
      this.logger.log(
        `MIS patient upsert request body (defaults+GUID fix): ${JSON.stringify(requestBody)}`,
      );

      const response = await fetch(this.patientUpsertUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          LoginToken: loginToken,
        },
        body: JSON.stringify(requestBody),
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

      if (misEnvelopeIndicatesFailure(parsed)) {
        let failMsg = '';
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const m = (parsed as Record<string, unknown>).message;
          if (typeof m === 'string') failMsg = m;
        }
        this.logger.error(
          `MIS AddOrUpdatePatient უარყოფილია (result=false ან Result=false)${failMsg ? `: ${failMsg}` : ''}`,
        );
        return { success: false, personId: null };
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

  async generateService(
    payload: MisGenerateServicePayload,
  ): Promise<MisGenerateServiceResult> {
    let loginToken = this.getStoredValue();
    if (!loginToken) {
      await this.refreshLoginToken();
      loginToken = this.getStoredValue();
    }

    if (!loginToken) {
      this.logger.error('Cannot call MIS GenerateService: LoginToken is empty');
      return { success: false, serviceId: null };
    }

    try {
      this.logger.log(
        `MIS GenerateService request | url=${this.generateServiceUrl}`,
      );
      this.logger.log(`MIS GenerateService body: ${JSON.stringify(payload)}`);

      const response = await fetch(this.generateServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          LoginToken: loginToken,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      this.logger.log(
        `MIS GenerateService ← HTTP ${response.status} ${response.statusText} | RAW BODY:\n${responseText}`,
      );

      if (!response.ok) {
        return { success: false, serviceId: null };
      }

      let parsed: unknown;
      const trimmed = responseText.trim();
      if (trimmed) {
        try {
          parsed = JSON.parse(trimmed) as unknown;
          this.logger.log(
            `MIS GenerateService ← PARSED:\n${JSON.stringify(parsed, null, 2)}`,
          );
        } catch {
          this.logger.warn(
            `MIS GenerateService: JSON parse error, slice: ${trimmed.slice(0, 800)}`,
          );
          parsed = undefined;
        }
      } else {
        parsed = undefined;
      }

      if (misEnvelopeIndicatesFailure(parsed)) {
        let failMsg = '';
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const m = (parsed as Record<string, unknown>).message;
          if (typeof m === 'string') failMsg = m;
        }
        this.logger.error(
          `MIS GenerateService უარყოფილია (result=false)${failMsg ? `: ${failMsg}` : ''}`,
        );
        return { success: false, serviceId: null };
      }

      const serviceId = tryPickMisGeneratedServiceId(parsed);

      this.logger.log(
        `MIS GenerateService ← ამოღებული serviceId: ${serviceId ?? '(არ ვიპოვე)'}`,
      );

      return { success: true, serviceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MIS GenerateService request error: ${message}`);
      return { success: false, serviceId: null };
    }
  }
}
