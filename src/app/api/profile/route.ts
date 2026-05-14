import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { profileInputSchema } from "@/lib/validation";

const DEFAULT_PROFILE = {
  name: "",
  role: "",
  bio: "",
  email: "",
  github: "",
  location: "",
};

export async function GET() {
  const row = await prisma.profile.findUnique({ where: { id: 1 } });
  return NextResponse.json(row ?? DEFAULT_PROFILE);
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const body = await req.json().catch(() => null);
  const parsed = profileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const saved = await prisma.profile.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return NextResponse.json(saved);
}
