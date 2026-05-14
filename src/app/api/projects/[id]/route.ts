import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { serializeProject } from "@/lib/project";
import { sanitizeBody } from "@/lib/sanitize";
import { projectInputSchema } from "@/lib/validation";
import { collectBlobUrls, deleteOrphans } from "@/lib/blob";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await prisma.project.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(serializeProject(row));
}

export async function PUT(req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = projectInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const cleanBody = sanitizeBody(data.body);

  try {
    const before = await prisma.project.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: data.title,
        period: data.period,
        desc: data.desc,
        body: cleanBody,
        image: data.image,
        tags: data.tags,
        links: data.links,
      },
    });

    // 더 이상 참조되지 않는 blob 정리. 실패해도 응답엔 영향 없음(best-effort).
    const oldUrls = collectBlobUrls(before.image, before.body);
    const newUrls = collectBlobUrls(updated.image, updated.body);
    void deleteOrphans(oldUrls, newUrls);

    return NextResponse.json(serializeProject(updated));
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const { id } = await ctx.params;
  try {
    const before = await prisma.project.findUnique({ where: { id } });
    await prisma.project.delete({ where: { id } });

    if (before) {
      const urls = collectBlobUrls(before.image, before.body);
      void deleteOrphans(urls, []);
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
