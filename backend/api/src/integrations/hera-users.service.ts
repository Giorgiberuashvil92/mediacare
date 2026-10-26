import { Injectable, Logger } from '@nestjs/common';
import { Gender, UserDocument, UserRole } from '../schemas/user.schema';

type HeraTier = 'free' | 'standard' | 'premium';
type HeraSubscriptionStatus = 'active' | 'inactive';

type HeraSubscriptionPayload = {
  tier: HeraTier;
  status: HeraSubscriptionStatus;
  expires_at?: string | null;
  source?: string | null;
  external_id?: string | null;
};

type HeraUserPayload = {
  user_type?: 'customer' | 'doctor';
  subscription?: HeraSubscriptionPayload;
  profile?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
    sex?: 'male' | 'female' | 'other' | null;
  };
};

@Injectable()
export class HeraUsersService {
  private readonly logger = new Logger(HeraUsersService.name);
  private readonly baseUrl =
    process.env.HERA_AI_API_URL ||
    'https://telemedicine-app-production-347c.up.railway.app';

  private get serverApiKey() {
    return (
      process.env.HERA_SERVER_API_KEY ||
      'hera-srv-kpMgGvB1a7mA9j2NtmyFGh1akE5wH17Yqc4nwaOp8SP0UX6a'
    );
  }

  private getUserId(user: UserDocument | { _id?: unknown; id?: string }) {
    const raw = user.id ?? user._id;
    return raw && typeof raw === 'object' && 'toString' in raw
      ? raw.toString()
      : String(raw || '');
  }

  private getUserType(role?: UserRole): 'customer' | 'doctor' {
    return role === UserRole.DOCTOR ? 'doctor' : 'customer';
  }

  private getSex(gender?: Gender): 'male' | 'female' | 'other' | null {
    if (gender === Gender.MALE) return 'male';
    if (gender === Gender.FEMALE) return 'female';
    if (gender === Gender.OTHER) return 'other';
    return null;
  }

  private getDateOnly(value?: Date | string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  async upsertUser(params: {
    user: UserDocument;
    subscription?: HeraSubscriptionPayload;
  }) {
    const userId = this.getUserId(params.user);
    if (!userId) return;

    const apiKey = this.serverApiKey;
    if (!apiKey) {
      this.logger.warn('HERA_SERVER_API_KEY is not configured; skipping user sync');
      return;
    }

    const payload: HeraUserPayload = {
      user_type: this.getUserType(params.user.role),
      subscription:
        params.subscription || {
          tier: 'free',
          status: 'active',
          source: 'mediacare',
        },
      profile: {
        name: params.user.name || null,
        email: params.user.email || null,
        phone: params.user.phone || null,
        date_of_birth: this.getDateOnly(params.user.dateOfBirth),
        sex: this.getSex(params.user.gender),
      },
    };

    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HERA user sync failed: ${response.status} ${body}`);
    }
  }

  async updateSubscription(params: {
    userId: string;
    tier: HeraTier;
    status: HeraSubscriptionStatus;
    expiresAt?: Date | string | null;
    externalId?: string | null;
  }) {
    const apiKey = this.serverApiKey;
    if (!apiKey) {
      this.logger.warn('HERA_SERVER_API_KEY is not configured; skipping subscription sync');
      return;
    }

    const payload: HeraUserPayload = {
      subscription: {
        tier: params.tier,
        status: params.status,
        expires_at: params.expiresAt
          ? new Date(params.expiresAt).toISOString()
          : null,
        source: 'mediacare_bog',
        external_id: params.externalId || null,
      },
    };

    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(params.userId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HERA subscription sync failed: ${response.status} ${body}`);
    }
  }

  async deleteUser(userId: string) {
    const apiKey = this.serverApiKey;
    if (!apiKey) {
      this.logger.warn('HERA_SERVER_API_KEY is not configured; skipping user delete');
      return;
    }

    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text().catch(() => '');
      throw new Error(`HERA user delete failed: ${response.status} ${body}`);
    }
  }

  async safeUpsertUser(params: {
    user: UserDocument;
    subscription?: HeraSubscriptionPayload;
  }) {
    try {
      await this.upsertUser(params);
    } catch (error) {
      this.logger.error('Failed to sync user to HERA', error);
    }
  }

  async safeUpdateSubscription(params: {
    userId: string;
    tier: HeraTier;
    status: HeraSubscriptionStatus;
    expiresAt?: Date | string | null;
    externalId?: string | null;
  }) {
    try {
      await this.updateSubscription(params);
    } catch (error) {
      this.logger.error('Failed to sync subscription to HERA', error);
    }
  }

  async safeDeleteUser(userId: string) {
    try {
      await this.deleteUser(userId);
    } catch (error) {
      this.logger.error('Failed to delete HERA user', error);
    }
  }
}
