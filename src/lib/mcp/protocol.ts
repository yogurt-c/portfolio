// MCP JSON-RPC 디스패처 (stateless, single request/response).
// SSE/notification 흐름은 다루지 않음 — 우리 툴은 모두 동기 request/response 라서 충분.
// 참고 스펙: https://modelcontextprotocol.io/specification (revision 2025-03-26)

import { callTool, listToolDefinitions } from "./tools";

export const PROTOCOL_VERSION = "2025-03-26";
export const SERVER_INFO = {
  name: "portfolio-mcp",
  title: "Portfolio Management",
  version: "0.1.0",
};

// JSON-RPC 표준 에러 코드.
const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function err(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

// id 가 있으면 request, 없으면 notification.
function isNotification(req: JsonRpcRequest): boolean {
  return req.id === undefined;
}

async function dispatchOne(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;

  switch (req.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: listToolDefinitions() });

    case "tools/call": {
      const params = req.params as
        | { name?: unknown; arguments?: unknown }
        | undefined;
      const name = typeof params?.name === "string" ? params.name : null;
      if (!name) return err(id, ERR_INVALID_PARAMS, "missing tool name");
      const result = await callTool(name, params?.arguments);
      return ok(id, result);
    }

    case "notifications/initialized":
    case "notifications/cancelled":
      // notification 은 응답 없음.
      return null;

    default:
      if (isNotification(req)) return null;
      return err(id, ERR_METHOD_NOT_FOUND, `method not found: ${req.method}`);
  }
}

// 단일 객체 또는 배치 — 스펙상 배치는 클라이언트가 거의 쓰지 않지만 표준 준수.
export async function handleJsonRpc(
  body: unknown,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return err(null, ERR_INVALID_REQUEST, "empty batch");
    }
    const responses: JsonRpcResponse[] = [];
    for (const item of body) {
      const r = await safeDispatch(item);
      if (r) responses.push(r);
    }
    return responses.length === 0 ? null : responses;
  }
  return safeDispatch(body);
}

async function safeDispatch(raw: unknown): Promise<JsonRpcResponse | null> {
  if (!raw || typeof raw !== "object") {
    return err(null, ERR_INVALID_REQUEST, "request must be an object");
  }
  const req = raw as JsonRpcRequest;
  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return err(req.id ?? null, ERR_INVALID_REQUEST, "invalid jsonrpc envelope");
  }
  try {
    return await dispatchOne(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(req.id ?? null, ERR_INTERNAL, msg);
  }
}

export function parseJsonOrError(text: string):
  | { ok: true; value: unknown }
  | { ok: false; response: JsonRpcResponse } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: err(null, ERR_PARSE, "parse error") };
  }
}
