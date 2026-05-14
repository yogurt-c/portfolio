import AdminBar from "@/components/admin/AdminBar";
import ProjectEditor from "@/components/admin/ProjectEditor";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <>
      <AdminBar title="New project" variant="form" />
      <ProjectEditor initial={null} />
    </>
  );
}
