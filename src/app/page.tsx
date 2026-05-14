import { prisma } from "@/lib/db";
import { serializeProject } from "@/lib/project";
import SiteHeader from "@/components/SiteHeader";
import SectionBar from "@/components/SectionBar";
import ProjectGrid from "@/components/ProjectGrid";
import SiteFooter from "@/components/SiteFooter";
import type { Profile } from "@/types";

const DEFAULT_PROFILE: Profile = {
  name: "Backend Engineer",
  role: "Backend Engineer",
  bio: "",
  email: "",
  github: "",
  location: "",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [profileRow, projectRows] = await Promise.all([
    prisma.profile.findUnique({ where: { id: 1 } }),
    prisma.project.findMany({ orderBy: { position: "asc" } }),
  ]);
  const profile: Profile = profileRow ?? DEFAULT_PROFILE;
  const projects = projectRows.map(serializeProject);

  return (
    <>
      <SiteHeader profile={profile} />
      <SectionBar count={projects.length} />
      <ProjectGrid projects={projects} />
      <SiteFooter />
    </>
  );
}
