import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { serializeProject } from "@/lib/project";
import { sanitizeBody } from "@/lib/sanitize";
import { projectInputSchema } from "@/lib/validation";
import { collectBlobUrls, deleteOrphans } from "@/lib/blob";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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
    // update 전 이전 URL 수집을 위해 먼저 조회 후 update를 트랜잭션으로 묶음.
    const [before, updated] = await prisma.$transaction(async (tx) => {
      const prev = await tx.project.findUnique({ where: { id } });
      if (!prev) throw Object.assign(new Error("not found"), { code: "P2025" });
      const next = await tx.project.update({
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
      return [prev, next];
    });

    const oldUrls = collectBlobUrls(before.image, before.body);
    const newUrls = collectBlobUrls(updated.image, updated.body);
    void deleteOrphans(oldUrls, newUrls);

    return NextResponse.json(serializeProject(updated));
  } catch (e) {
    if (
      (e instanceof PrismaClientKnownRequestError && e.code === "P2025") ||
      (e instanceof Error && e.message === "not found")
    ) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const { id } = await ctx.params;
  try {
    // findUnique + delete를 트랜잭션으로 묶어 네트워크 왕복 1회로 처리.
    const deleted = await prisma.$transaction(async (tx) => {
      const row = await tx.project.findUnique({ where: { id } });
      if (!row) return null;
      await tx.project.delete({ where: { id } });
      return row;
    });

    if (!deleted) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const urls = collectBlobUrls(deleted.image, deleted.body);
    void deleteOrphans(urls, []);

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
