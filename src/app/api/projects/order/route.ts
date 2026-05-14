import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { reorderSchema } from "@/lib/validation";

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid order" }, { status: 400 });
  }

  const { order } = parsed.data;
  // order 에 없는 id 가 있어도 무시. 트랜잭션으로 position 일괄 갱신.
  await prisma.$transaction(
    order.map((id, idx) =>
      prisma.project.update({ where: { id }, data: { position: idx } }),
    ),
  );

  const rows = await prisma.project.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json({ count: rows.length });
}
