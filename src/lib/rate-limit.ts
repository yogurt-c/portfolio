// 로그인 브루트포스 완화 — 인메모리 IP 단위 카운터.
// 단일 인스턴스 가정. 멀티 인스턴스로 가면 Redis 등 공유 스토리지로 교체.

const WINDOW_MS = 5 * 60_000; // 5분
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60_000; // 5분

type Bucket = {
  fails: number;
  windowStart: number;
  lockedUntil: number;
};

const buckets = new Map<string, Bucket>();

export type RateGate =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkLoginRate(ip: string): RateGate {
  const now = Date.now();
  const b = buckets.get(ip);
  if (b && b.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  return { ok: true };
}

export function recordLoginFailure(ip: string): RateGate {
  const now = Date.now();
  const cur = buckets.get(ip);
  const b: Bucket = cur ?? { fails: 0, windowStart: now, lockedUntil: 0 };

  // 윈도우 만료되면 카운터 리셋
  if (now - b.windowStart > WINDOW_MS) {
    b.fails = 0;
    b.windowStart = now;
  }
  b.fails += 1;

  if (b.fails >= MAX_FAILS) {
    b.lockedUntil = now + LOCK_MS;
    b.fails = 0;
    b.windowStart = now;
    buckets.set(ip, b);
    return { ok: false, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }

  buckets.set(ip, b);
  return { ok: true };
}

export function recordLoginSuccess(ip: string): void {
  buckets.delete(ip);
}

// 만료된 버킷 주기적 청소 — 메모리 누수 방지.
declare global {
  // eslint-disable-next-line no-var
  var __rateLimitCleanup: ReturnType<typeof setInterval> | undefined;
}
if (!globalThis.__rateLimitCleanup && typeof setInterval !== "undefined") {
  globalThis.__rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      const dead = v.lockedUntil < now && now - v.windowStart > WINDOW_MS;
      if (dead) buckets.delete(k);
    }
  }, 60_000);
  globalThis.__rateLimitCleanup.unref?.();
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
