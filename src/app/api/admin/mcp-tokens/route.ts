import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { mcpTokenCreateSchema } from "@/lib/validation";
import { createMcpToken, listMcpTokens } from "@/lib/mcp-token";

export async function GET() {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const tokens = await listMcpTokens();
  return NextResponse.json(tokens);
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const body = await req.json().catch(() => null);
  const parsed = mcpTokenCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await createMcpToken(parsed.data.label);
  // 평문은 이 응답에서만 노출. 다음 요청부터 재현 불가.
  return NextResponse.json(created, { status: 201 });
}
