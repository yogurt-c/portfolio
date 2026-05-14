import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { serializeProject } from "@/lib/project";
import AdminBar from "@/components/admin/AdminBar";
import ProjectEditor from "@/components/admin/ProjectEditor";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await prisma.project.findUnique({ where: { id } });
  if (!row) notFound();

  return (
    <>
      <AdminBar title="Edit project" variant="form" />
      <ProjectEditor initial={serializeProject(row)} />
    </>
  );
}
