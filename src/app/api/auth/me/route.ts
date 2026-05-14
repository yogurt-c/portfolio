import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.authed) {
    return NextResponse.json({ authed: false }, { status: 401 });
  }
  return NextResponse.json({ authed: true });
}
