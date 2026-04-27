import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

/** ნორმალიზებული პასუხი (Swagger ხშირად PascalCase: Code, Message, Value) */
type MisLoginResponse = {
  code: number;
  message: string;
  value?: string;
};

/** GET /api/Home/Login JSON — .NET-ს შეიძლება Code/Message/Value ან camelCase */
function parseMisLoginResponse(raw: unknown): MisLoginResponse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const codeRaw = r.code ?? r.Code;
  const msgRaw = r.message ?? r.Message;
  const valRaw = r.value ?? r.Value;

  const code =
    typeof codeRaw === 'number'
      ? codeRaw
      : typeof codeRaw === 'string'
        ? Number.parseInt(codeRaw, 10)
        : NaN;
  if (Number.isNaN(code)) {
    return null;
  }

  const message = typeof msgRaw === 'string' ? msgRaw : '';

  let value: string | undefined;
  if (typeof valRaw === 'string' && valRaw.trim()) {
    value = valRaw.trim();
  }

  return { code, message, value };
}

type MisPatientPayload = {
  /** null/არავალიდური Guid = ახალი პაციენტი → JSON-ში ID: null; ვალიდური Guid = განახლება */
  ID: string | null;
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

const GUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidString(s: string): boolean {
  return GUID_REGEX.test(s.trim());
}

/**
 * ID: ვალიდური Guid — განახლება; სხვა (null, Mongo id, Guid.Empty არ ეთანხმება regex-ს) → JSON-ში ID: null.
 * UserID: ვალიდური Guid თუ არა — ცალკე randomUUID.
 */
function misPatientIdsForRequest(payload: MisPatientPayload): {
  ID: string | null;
  UserID: string;
} {
  const userRaw =
    typeof payload.UserID === 'string' ? payload.UserID.trim() : '';
  const userId = isUuidString(userRaw) ? userRaw : randomUUID();

  if (payload.ID != null && isUuidString(payload.ID)) {
    const id = payload.ID.trim();
    return {
      ID: id,
      UserID: isUuidString(userRaw) ? userRaw : id,
    };
  }
  return { ID: null, UserID: userId };
}

/** MIS-ზე მხოლოდ ის ველები, რაც აპლიკაციიდან მოდის (`MisPatientPayload` + გამოთვლილი ID/UserID). */
function buildMisAddOrUpdateRequestBody(
  payload: MisPatientPayload,
): Record<string, unknown> {
  const ids = misPatientIdsForRequest(payload);
  return {
    ...payload,
    ...ids,
  };
}

/** undefined არ ვაგზავნოთ; null რჩება. ცარიელი სტრიქონები რჩება. */
function misPatientRequestPlainObject(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

function misEnvelopeIndicatesFailure(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }
  const r = parsed as Record<string, unknown>;
  return r.result === false || r.Result === false;
}

/** cancel + value იგივეა რაც მოთხოვნაში ID — ხშივად echoა, პაციენტი შეიძლება საერთოდ არ იყოს შენახული */
function misPatientUpsertCanceledWithEchoedId(
  failMsg: string,
  personId: string | null,
  sentRequestId: string,
): boolean {
  if (!personId || !sentRequestId) {
    return false;
  }
  const canceled =
    /\bcancel(?:led|ed)?\b/i.test(failMsg) ||
    /task was canceled/i.test(failMsg);
  if (!canceled) {
    return false;
  }
  return personId.trim().toLowerCase() === sentRequestId.trim().toLowerCase();
}

/**
 * MIS AddOrUpdatePatient პასუხიდან პაციენტის ID (HIS: envelope `value` = PatientID; ობიექტში — სხვა ველებიც).
 */
function tryPickPersonIdFromMisBody(parsed: unknown): string | null {
  const keys = [
    'PatientID',
    'patientId',
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
  /** envelope `value` — ოფიციალურად PatientID (სტრიქონი GUID), ზოგჯერ echo/გაუქმებული ტასკი */
  const envStr = root.value ?? root.Value;
  if (typeof envStr === 'string') {
    const t = envStr.trim();
    if (t && isUuidString(t)) {
      return t;
    }
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

export type MisGetFormsByServiceIdResult = {
  success: boolean;
  /** სრული დაპარსული JSON (envelope ან პირდაპირ მასივი — HIS-ის მიხედვით) */
  body: unknown;
};

export type MisBinaryDownloadResult = {
  success: boolean;
  status: number | null;
  buffer: Buffer | null;
  contentType: string | null;
  fileName: string | null;
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

function pickFileNameFromDisposition(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = /filename\s*=\s*"([^"]+)"/i.exec(contentDisposition);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = /filename\s*=\s*([^;]+)/i.exec(contentDisposition);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return null;
}

@Injectable()
export class MisAuthService implements OnApplicationBootstrap, OnModuleDestroy {
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
  private readonly printFormGetFormsUrl =
    process.env.MIS_PRINT_FORM_GET_FORMS_URL ||
    'http://185.247.94.160/MISNew/MIS.Ambulatory/MIS.Ambulatory.API/api/PrintForm/GetFormsByServiceID';

  private storedValue: string | null = null;
  private lastResponse: MisLoginResponse | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly autoRefreshIntervalMs = Number.parseInt(
    process.env.MIS_AUTH_AUTO_REFRESH_MS || `${25 * 60 * 1000}`,
    10,
  );

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log(
      'MIS: აპლიკაციის bootstrap — GET Login, LoginToken მეხსიერებაში',
    );
    await this.refreshLoginToken();

    const bootstrapToken = this.getStoredValue();
    if (bootstrapToken) {
      this.logger.log(
        `MIS bootstrap token ready | length=${bootstrapToken.length} | token=${bootstrapToken}`,
      );
    } else {
      this.logger.warn('MIS bootstrap token missing after initial login');
    }

    this.startAutoRefresh();
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private startAutoRefresh(): void {
    if (
      !Number.isFinite(this.autoRefreshIntervalMs) ||
      this.autoRefreshIntervalMs < 60_000
    ) {
      this.logger.warn(
        `MIS auto refresh გამორთულია: MIS_AUTH_AUTO_REFRESH_MS არავალიდურია (${this.autoRefreshIntervalMs})`,
      );
      return;
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      void (async () => {
        try {
          this.logger.log(
            `MIS auto refresh tick: GET /api/Home/Login ყოველ ${Math.round(
              this.autoRefreshIntervalMs / 1000,
            )} წამში`,
          );
          await this.refreshLoginToken();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`MIS auto refresh შეცდომა: ${message}`);
        }
      })();
    }, this.autoRefreshIntervalMs);

    this.logger.log(
      `MIS auto refresh ჩართულია: ${Math.round(
        this.autoRefreshIntervalMs / 1000,
      )} წამი`,
    );
  }

  /**
   * MIS მოთხოვნამდე LoginToken-ის უზრუნველყოფა.
   * forceRefresh=true → ყოველთვის ხელახლა გამოიძახებს GET /api/Home/Login-ს.
   */
  async ensureMisLoginToken(forceRefresh = false): Promise<string | null> {
    if (forceRefresh) {
      this.logger.log(
        'MIS force refresh: მოთხოვნამდე ვიძახებთ GET /api/Home/Login-ს',
      );
      await this.refreshLoginToken();
      return this.getStoredValue();
    }

    let token = this.getStoredValue();
    if (!token) {
      this.logger.warn(
        'MIS LoginToken ცარიელია — refreshLoginToken() მოთხოვნამდე',
      );
      await this.refreshLoginToken();
      token = this.getStoredValue();
    }
    return token;
  }

  async refreshLoginToken(): Promise<MisLoginResponse | null> {
    const url = new URL(this.loginUrl);
    url.searchParams.set('loginName', this.loginName);
    url.searchParams.set('password', this.password);

    try {
      this.logger.log(`MIS GET Login: ${url.origin}${url.pathname}`);

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

      const rawJson: unknown = await response.json();
      const data = parseMisLoginResponse(rawJson);
      if (!data) {
        this.logger.error(
          `MIS login: პასუხის ფორმატი არ ვიცნობ ${JSON.stringify(rawJson)}`,
        );
        return null;
      }

      this.lastResponse = data;

      if (data.value) {
        this.storedValue = data.value;
        if (data.code !== 0) {
          this.logger.warn(
            `MIS login: Code=${data.code} (სავარაუდოდ 0 უნდა იყოს წარმატებაზე), მაგრამ Value მოვიდა — ვინახავთ LoginToken-ს`,
          );
        }
        this.logger.log(
          `MIS LoginToken (header LoginToken Ambulatory-ზე), სიგრძე=${data.value.length}: ${data.value}`,
        );
      } else {
        this.logger.warn(
          `MIS login: Value ცარიელია — Ambulatory მოთხოვნებზე LoginToken არ გექნება. code=${data.code} message="${data.message}"`,
        );
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
    const loginToken = await this.ensureMisLoginToken(true);

    if (!loginToken) {
      this.logger.error('Cannot upsert MIS patient: LoginToken is empty');
      return { success: false, personId: null };
    }

    try {
      this.logger.log(
        `MIS patient upsert request | url=${this.patientUpsertUrl} | hasLoginToken=${Boolean(loginToken)}`,
      );
      const requestBody = buildMisAddOrUpdateRequestBody(payload);
      const rawSentId = requestBody.ID;
      const sentMisPatientGuid = typeof rawSentId === 'string' ? rawSentId : '';
      const plainBody = misPatientRequestPlainObject(requestBody);
      const bodyJson = JSON.stringify(plainBody);
      this.logger.log(
        `MIS patient upsert body (მხოლოდ აპლიკაციის ველები, undefined ამოღებული):\n${JSON.stringify(plainBody, null, 2)}`,
      );
      this.logger.log(
        `MIS patient upsert request payload (exact outbound):\n${JSON.stringify(
          {
            method: 'POST',
            url: this.patientUpsertUrl,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              LoginToken: loginToken,
            },
            body: plainBody,
          },
          null,
          2,
        )}`,
      );
      this.logger.log(
        `MIS_UPSERT_OUTBOUND::${JSON.stringify({
          method: 'POST',
          url: this.patientUpsertUrl,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            LoginToken: loginToken,
          },
          body: plainBody,
        })}`,
      );

      const response = await fetch(this.patientUpsertUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          LoginToken: loginToken,
        },
        body: bodyJson,
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

      if (misEnvelopeIndicatesFailure(parsed)) {
        let failMsg = '';
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const m = (parsed as Record<string, unknown>).message;
          if (typeof m === 'string') failMsg = m;
        }
        if (personId) {
          if (
            misPatientUpsertCanceledWithEchoedId(
              failMsg,
              personId,
              sentMisPatientGuid,
            )
          ) {
            this.logger.error(
              `MIS AddOrUpdatePatient: result=false + „canceled“ და value ემთხვევა გაგზავნილ ID-ს (${personId}) — სავარაუდოდ პაციენტი არ დარეგისტრირდა (echo), წარუმატებლად ვითვლით.${failMsg ? ` message=${failMsg}` : ''}`,
            );
            return { success: false, personId: null };
          }
          this.logger.warn(
            `MIS AddOrUpdatePatient: result=false, მაგრამ სხვა სიგნალი PersonID-ზე (${personId}) — წარმატებად ვითვლით (დაადასტურე MIS-ში).${failMsg ? ` message=${failMsg}` : ''}`,
          );
          return { success: true, personId };
        }
        this.logger.error(
          `MIS AddOrUpdatePatient უარყოფილია (result=false ან Result=false)${failMsg ? `: ${failMsg}` : ''}`,
        );
        return { success: false, personId: null };
      }

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
    const loginToken = await this.ensureMisLoginToken(true);

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

  /** Relative path თუ მოვიდა, MIS base-ზე ავაწყოთ absolute URL. */
  private toAbsoluteMisUrl(urlOrPath: string): string {
    const raw = urlOrPath.trim();
    if (!raw) {
      return raw;
    }
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    const base = this.generateServiceUrl.replace(/\/$/, '');
    try {
      return new URL(raw, `${base}/`).toString();
    } catch {
      return raw;
    }
  }

  /**
   * MIS URL-დან ბინარული კონტენტის ჩამოტვირთვა (LoginToken header-ით).
   * გამოიყენება PrintForm-ის PDF-ად გადმოსაწერად.
   */
  async downloadBinaryFromMis(
    urlOrPath: string,
  ): Promise<MisBinaryDownloadResult> {
    const raw = urlOrPath?.trim();
    if (!raw) {
      return {
        success: false,
        status: null,
        buffer: null,
        contentType: null,
        fileName: null,
      };
    }

    const loginToken = await this.ensureMisLoginToken(true);
    if (!loginToken) {
      this.logger.error('Cannot download MIS binary: LoginToken is empty');
      return {
        success: false,
        status: null,
        buffer: null,
        contentType: null,
        fileName: null,
      };
    }

    const absoluteUrl = this.toAbsoluteMisUrl(raw);

    try {
      this.logger.log(`MIS binary download GET: ${absoluteUrl}`);

      const response = await fetch(absoluteUrl, {
        method: 'GET',
        headers: {
          LoginToken: loginToken,
          Accept: 'application/pdf,application/octet-stream,*/*',
        },
      });

      if (!response.ok) {
        this.logger.error(
          `MIS binary download failed: HTTP ${response.status} url=${absoluteUrl}`,
        );
        return {
          success: false,
          status: response.status,
          buffer: null,
          contentType: null,
          fileName: null,
        };
      }

      const buf = Buffer.from(await response.arrayBuffer());
      return {
        success: true,
        status: response.status,
        buffer: buf,
        contentType: response.headers.get('content-type'),
        fileName: pickFileNameFromDisposition(
          response.headers.get('content-disposition'),
        ),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MIS binary download error: ${message}`);
      return {
        success: false,
        status: null,
        buffer: null,
        contentType: null,
        fileName: null,
      };
    }
  }

  /**
   * GET /api/PrintForm/GetFormsByServiceID?ServiceID={GenerateService-ის value}
   * Query პარამეტრის სახელი HIS Swagger-ით დაადასტურე; ASP.NET ხშირად case-insensitiveა.
   */
  async getFormsByServiceId(
    generatedServiceInstanceId: string,
  ): Promise<MisGetFormsByServiceIdResult> {
    const id = generatedServiceInstanceId?.trim();
    if (!id) {
      return { success: false, body: null };
    }

    const base = this.printFormGetFormsUrl.replace(/\/$/, '');
    const sep = base.includes('?') ? '&' : '?';
    const url = `${base}${sep}ServiceID=${encodeURIComponent(id)}`;

    let lastResult: MisGetFormsByServiceIdResult = {
      success: false,
      body: null,
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        this.logger.warn(
          'MIS GetFormsByServiceID: მეორე ცდა — LoginToken ხელახლა განახლება',
        );
        this.storedValue = null;
        await this.refreshLoginToken();
      }

      const loginToken = await this.ensureMisLoginToken(true);
      if (!loginToken) {
        this.logger.error(
          'Cannot call MIS GetFormsByServiceID: LoginToken is empty',
        );
        return { success: false, body: null };
      }

      try {
        this.logger.log(
          `MIS GetFormsByServiceID GET (ცდა ${attempt + 1}/2): ${url}`,
        );

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            LoginToken: loginToken,
            Accept: 'application/json',
          },
        });

        const responseText = await response.text();
        this.logger.log(
          `MIS GetFormsByServiceID ← HTTP ${response.status} | RAW (პირველი 1200 სიმბოლო): ${responseText.slice(0, 1200)}`,
        );

        if (!response.ok) {
          lastResult = { success: false, body: null };
          continue;
        }

        const trimmed = responseText.trim();
        if (!trimmed) {
          return { success: true, body: null };
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(trimmed) as unknown;
          this.logger.log(
            `MIS GetFormsByServiceID ← PARSED:\n${JSON.stringify(parsed, null, 2).slice(0, 4000)}${JSON.stringify(parsed, null, 2).length > 4000 ? '\n…(truncated)' : ''}`,
          );
        } catch {
          this.logger.warn(
            'MIS GetFormsByServiceID: პასუხი JSON არ არის — ინახება raw ტექსტად',
          );
          return { success: true, body: { raw: trimmed } };
        }

        if (misEnvelopeIndicatesFailure(parsed)) {
          let failMsg = '';
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const m = (parsed as Record<string, unknown>).message;
            if (typeof m === 'string') failMsg = m;
          }
          this.logger.error(
            `MIS GetFormsByServiceID უარყოფილია (result=false)${failMsg ? `: ${failMsg}` : ''}`,
          );
          lastResult = { success: false, body: parsed };
          continue;
        }

        return { success: true, body: parsed };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`MIS GetFormsByServiceID request error: ${message}`);
        lastResult = { success: false, body: null };
      }
    }

    return lastResult;
  }
}
