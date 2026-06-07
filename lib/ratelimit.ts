import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Window = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

// Lazily instantiated to avoid crashing on startup if env vars are absent
const cache = new Map<string, Ratelimit>();

function get(prefix: string, requests: number, window: Window): Ratelimit {
  const key = `${prefix}:${requests}:${window}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(requests, window),
        prefix: `prode:${prefix}`,
      }),
    );
  }
  return cache.get(key)!;
}

export async function checkRateLimit(
  prefix: string,
  identifier: string,
  requests: number,
  window: Window,
): Promise<{ allowed: boolean }> {
  const rl = get(prefix, requests, window);
  const { success } = await rl.limit(identifier);
  return { allowed: success };
}

export function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
