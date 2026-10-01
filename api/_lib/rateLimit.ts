interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();

const memoryLimit = (key: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
};

const upstashLimit = async (
  key: string,
  limit: number,
): Promise<boolean | null> => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, 60, "NX"],
      ]),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = payload[0]?.result;
    return typeof count === "number" ? count <= limit : null;
  } catch {
    return null;
  }
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Best-effort abuse control for a public demo endpoint.
 * Uses Upstash Redis when configured (shared across function instances).
 * The in-memory fallback is per-instance and resets with the instance, so
 * production deployments that need a hard cap should configure Upstash
 * and a Vercel spend alert / kill switch.
 */
export const rateLimit = async (
  endpoint: string,
  ip: string,
  limitPerMinute: number,
): Promise<RateLimitResult> => {
  const minute = Math.floor(Date.now() / 60_000);
  const key = `estatematch:${endpoint}:${ip}:${minute}`;
  const shared = await upstashLimit(key, limitPerMinute);
  if (shared !== null) {
    return { allowed: shared, retryAfterSeconds: shared ? 0 : 60 - (Math.floor(Date.now() / 1000) % 60) };
  }
  const allowed = memoryLimit(key, limitPerMinute, 60_000);
  return { allowed, retryAfterSeconds: allowed ? 0 : 60 };
};
