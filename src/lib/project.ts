import type { Project as DbProject } from "@prisma/client";
import type { Project, ProjectLink } from "@/types";

const safeJSON = <T>(s: string, fallback: T): T => {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

export function serializeProject(row: DbProject): Project {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    desc: row.desc,
    body: row.body,
    image: row.image,
    tags: safeJSON<string[]>(row.tags, []),
    links: safeJSON<ProjectLink[]>(row.links, []),
    position: row.position,
  };
}
