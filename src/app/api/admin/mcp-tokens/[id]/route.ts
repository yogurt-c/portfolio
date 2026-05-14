import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { revokeMcpToken } from "@/lib/mcp-token";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const { id } = await ctx.params;
  const ok = await revokeMcpToken(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
