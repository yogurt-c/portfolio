import { prisma } from "@/lib/db";
import { serializeProject } from "@/lib/project";
import AdminBar from "@/components/admin/AdminBar";
import AdminList from "@/components/admin/AdminList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const rows = await prisma.project.findMany({ orderBy: { position: "asc" } });
  const projects = rows.map(serializeProject);

  return (
    <>
      <AdminBar title="Projects" variant="list" />
      <AdminList initial={projects} />
    </>
  );
}
