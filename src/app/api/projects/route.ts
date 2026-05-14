import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { serializeProject } from "@/lib/project";
import { sanitizeBody } from "@/lib/sanitize";
import { projectInputSchema } from "@/lib/validation";

export async function GET() {
  const rows = await prisma.project.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(rows.map(serializeProject));
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const body = await req.json().catch(() => null);
  const parsed = projectInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 신규는 목록 맨 앞에. 기존 항목들의 position 을 +1 밀어주는 단일 트랜잭션.
  const created = await prisma.$transaction(async (tx) => {
    await tx.project.updateMany({ data: { position: { increment: 1 } } });
    return tx.project.create({
      data: {
        title: data.title,
        year: data.year,
        desc: data.desc,
        body: sanitizeBody(data.body),
        image: data.image,
        tags: data.tags,
        links: data.links,
        position: 0,
      },
    });
  });

  return NextResponse.json(serializeProject(created), { status: 201 });
}
