import type { Project as DbProject } from "@prisma/client";
import type { Project, ProjectLink } from "@/types";

// Prisma 의 Json 컬럼은 JsonValue (광범위) 로 타입이 떨어진다.
// 입력은 validation.ts 에서 ProjectLink[] 형태로만 통과되므로
// 읽을 때는 안전하게 좁히기만 한다.
function asLinks(v: unknown): ProjectLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (x): x is ProjectLink =>
        !!x &&
        typeof x === "object" &&
        typeof (x as ProjectLink).label === "string" &&
        typeof (x as ProjectLink).url === "string",
    );
}

export function serializeProject(row: DbProject): Project {
  return {
    id: row.id,
    title: row.title,
    period: row.period,
    desc: row.desc,
    body: row.body,
    image: row.image,
    tags: row.tags,
    links: asLinks(row.links),
    position: row.position,
  };
}
