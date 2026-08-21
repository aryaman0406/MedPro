import { Redis } from "@upstash/redis";

// Interface for slot hold state
export interface SlotHoldData {
  userId: string;
  expiresInSeconds: number;
}

// In-Memory Redis Mock Adapter (used when Upstash credentials are not configured)
class InMemoryRedisAdapter {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async set(key: string, value: string, options?: { nx?: boolean; ex?: number }): Promise<"OK" | null> {
    this.cleanExpired();
    const existing = this.store.get(key);

    if (options?.nx && existing && existing.expiresAt > Date.now()) {
      return null; // Key exists, NX failed
    }

    const ttlMs = (options?.ex ?? 300) * 1000;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    return "OK";
  }

  async get(key: string): Promise<string | null> {
    this.cleanExpired();
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async ttl(key: string): Promise<number> {
    this.cleanExpired();
    const entry = this.store.get(key);
    if (!entry) return -2;
    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.store.delete(key);
      return -2;
    }
    return Math.ceil(remainingMs / 1000);
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    this.cleanExpired();
    const prefix = pattern.replace("*", "");
    const matching: string[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > Date.now() && key.startsWith(prefix)) {
        matching.push(key);
      }
    }
    return matching;
  }

  private cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

// Global in-memory singleton to persist holds across hot-reloads
const globalForRedis = globalThis as unknown as {
  inMemoryRedis: InMemoryRedisAdapter | undefined;
};

const inMemoryRedisInstance = globalForRedis.inMemoryRedis ?? new InMemoryRedisAdapter();
if (process.env.NODE_ENV !== "production") globalForRedis.inMemoryRedis = inMemoryRedisInstance;

const hasUpstashConfig =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_URL.startsWith("http");

export const redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : inMemoryRedisInstance;

/**
 * Format hold key: hold:{doctorId}:{isoStartTime}
 */
export function formatSlotHoldKey(doctorId: string, isoStartTime: string): string {
  return `hold:${doctorId}:${isoStartTime}`;
}

/**
 * Place a short-lived hold on a slot (atomic SET NX EX)
 * @returns true if hold was acquired, false if already held by another user
 */
export async function setSlotHold(
  doctorId: string,
  isoStartTime: string,
  userId: string,
  ttlSeconds = 300
): Promise<boolean> {
  const key = formatSlotHoldKey(doctorId, isoStartTime);
  try {
    const result = await redis.set(key, userId, { nx: true, ex: ttlSeconds });
    return result === "OK";
  } catch (error) {
    console.error("Error setting slot hold in Redis:", error);
    return false;
  }
}

/**
 * Check if a slot is held and retrieve the remaining TTL
 */
export async function getSlotHold(
  doctorId: string,
  isoStartTime: string
): Promise<SlotHoldData | null> {
  const key = formatSlotHoldKey(doctorId, isoStartTime);
  try {
    const [userId, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
    if (!userId || typeof userId !== "string" || ttl <= 0) {
      return null;
    }
    return {
      userId,
      expiresInSeconds: ttl,
    };
  } catch (error) {
    console.error("Error getting slot hold from Redis:", error);
    return null;
  }
}

/**
 * Release a slot hold if owned by the given userId
 */
export async function releaseSlotHold(
  doctorId: string,
  isoStartTime: string,
  userId: string
): Promise<boolean> {
  const key = formatSlotHoldKey(doctorId, isoStartTime);
  try {
    const currentHolder = await redis.get(key);
    if (currentHolder === userId) {
      await redis.del(key);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error releasing slot hold in Redis:", error);
    return false;
  }
}

/**
 * Force delete a slot hold (after successful booking)
 */
export async function deleteSlotHold(
  doctorId: string,
  isoStartTime: string
): Promise<void> {
  const key = formatSlotHoldKey(doctorId, isoStartTime);
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Error deleting slot hold from Redis:", error);
  }
}

/**
 * Retrieve all active holds for a specific doctor
 */
export async function getAllDoctorHolds(
  doctorId: string
): Promise<Map<string, SlotHoldData>> {
  const holds = new Map<string, SlotHoldData>();
  try {
    const prefix = `hold:${doctorId}:`;
    const keys = await redis.keys(`${prefix}*`);

    await Promise.all(
      keys.map(async (key) => {
        const isoStartTime = key.replace(prefix, "");
        const [userId, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
        if (userId && typeof userId === "string" && ttl > 0) {
          holds.set(isoStartTime, {
            userId,
            expiresInSeconds: ttl,
          });
        }
      })
    );
  } catch (error) {
    console.error("Error fetching all doctor holds from Redis:", error);
  }
  return holds;
}
