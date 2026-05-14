import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import {
  checkLoginRate,
  recordLoginFailure,
  recordLoginSuccess,
  getClientIp,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // 1) 락이 걸려있으면 즉시 거절.
  const gate = checkLoginRate(ip);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "too many attempts", retryAfter: gate.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(gate.retryAfterSec) },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedHash) {
    return NextResponse.json(
      {
        error:
          "server not configured: ADMIN_PASSWORD_HASH 가 비어있습니다. 'make admin-pw' 실행 필요.",
      },
      { status: 500 },
    );
  }

  // bcrypt.compare 는 내부적으로 timing-safe.
  const ok = await bcrypt.compare(parsed.data.password, expectedHash);
  if (!ok) {
    const after = recordLoginFailure(ip);
    if (!after.ok) {
      return NextResponse.json(
        { error: "too many attempts", retryAfter: after.retryAfterSec },
        {
          status: 429,
          headers: { "Retry-After": String(after.retryAfterSec) },
        },
      );
    }
    return NextResponse.json({ error: "invalid password" }, { status: 401 });
  }

  recordLoginSuccess(ip);
  const session = await getSession();
  session.authed = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
