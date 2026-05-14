import { NextResponse } from "next/server";
import { authenticateMcp } from "@/lib/mcp/auth";
import { handleJsonRpc, parseJsonOrError } from "@/lib/mcp/protocol";

// MCP Streamable HTTP transport — POST 한 방으로 JSON-RPC 처리.
// SSE/GET 흐름은 미구현 (notification 안 보냄). Claude Desktop 의 mcp-remote 브릿지나
// Claude Code 의 --transport http 모드와 호환.

export const dynamic = "force-dynamic";

function unauth(message: string, status: number, retryAfter?: number) {
  const headers: Record<string, string> = {
    "WWW-Authenticate": 'Bearer realm="portfolio-mcp"',
  };
  if (retryAfter !== undefined) headers["Retry-After"] = String(retryAfter);
  return NextResponse.json({ error: message }, { status, headers });
}

export async function POST(req: Request) {
  const auth = await authenticateMcp(req);
  if (!auth.ok) return unauth(auth.message, auth.status, auth.retryAfter);

  const text = await req.text();
  if (!text) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "empty body" } },
      { status: 400 },
    );
  }

  const parsed = parseJsonOrError(text);
  if (!parsed.ok) {
    return NextResponse.json(parsed.response, { status: 400 });
  }

  const response = await handleJsonRpc(parsed.value);
  if (response === null) {
    // 모든 메시지가 notification 이었던 경우 — 스펙상 202 + body 없음.
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(response);
}

// 일부 클라이언트가 capability probing 으로 GET 을 보낼 수 있음 — 405 로 명확히.
export function GET() {
  return NextResponse.json(
    { error: "method not allowed; use POST with JSON-RPC body" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
