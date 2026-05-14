import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  authed?: boolean;
};

const cookieOptions: SessionOptions["cookieOptions"] = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function buildOptions(): SessionOptions {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    // 의도적으로 fallback 없음. 빈 키로 서명된 쿠키 == 위조 가능.
    throw new Error(
      "SESSION_PASSWORD 가 비어있거나 32자 미만입니다. .env 를 확인하거나 'make env' 를 실행하세요.",
    );
  }
  return {
    password,
    cookieName: "portfolio_session",
    cookieOptions,
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), buildOptions());
}

export async function requireAdmin(): Promise<true | Response> {
  const s = await getSession();
  if (!s.authed) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return true;
}
