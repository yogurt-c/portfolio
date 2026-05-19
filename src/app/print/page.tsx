import { prisma } from "@/lib/db";
import { serializeProject } from "@/lib/project";
import type { Profile, Project } from "@/types";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const DEFAULT_PROFILE: Profile = {
  name: "Portfolio",
  role: "",
  bio: "",
  email: "",
  github: "",
  location: "",
};

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = ids?.split(",").filter(Boolean) ?? [];

  const [profileRow, projectRows] = await Promise.all([
    prisma.profile.findUnique({ where: { id: 1 } }),
    idList.length > 0
      ? prisma.project.findMany({
          where: { id: { in: idList } },
          orderBy: { position: "asc" },
        })
      : prisma.project.findMany({ orderBy: { position: "asc" } }),
  ]);

  const profile: Profile = profileRow ?? DEFAULT_PROFILE;
  const fetched = projectRows.map(serializeProject);

  // idList 순서를 유지 (선택 순서 반영)
  const projects: Project[] =
    idList.length > 0
      ? idList.flatMap((id) => fetched.filter((p) => p.id === id))
      : fetched;

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <a href="/" className="print-back">
          ← 돌아가기
        </a>
        <PrintButton />
      </div>

      <header className="print-profile">
        <div className="print-profile-left">
          <h1 className="print-name">{profile.name}</h1>
          {profile.role && <div className="print-role">{profile.role}</div>}
          {profile.bio && <p className="print-bio">{profile.bio}</p>}
        </div>
        {(profile.location || profile.email || profile.github) && (
          <div className="print-profile-meta">
            {profile.location && (
              <div>
                <b>{profile.location}</b>
              </div>
            )}
            {profile.email && <div>{profile.email}</div>}
            {profile.github && <div>{profile.github}</div>}
          </div>
        )}
      </header>

      <div className="print-rule" />

      {projects.map((project, i) => (
        <article key={project.id} className="print-project">
          <div className="print-project-hd">
            <span className="print-idx">
              [{String(i + 1).padStart(2, "0")}]
            </span>
            <div>
              <h2 className="print-title">{project.title}</h2>
              {project.period && (
                <div className="print-period">{project.period}</div>
              )}
            </div>
          </div>

          {project.image && (
            <div className="print-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project.image} alt={project.title} />
            </div>
          )}

          {project.desc && <p className="print-desc">{project.desc}</p>}

          {project.body && (
            <div
              className="print-body tt-content"
              // body는 관리자가 작성한 Tiptap HTML. 신뢰 가능한 단일 작성자.
              dangerouslySetInnerHTML={{ __html: project.body }}
            />
          )}

          {project.tags.length > 0 && (
            <div className="print-tags">
              {project.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {project.links.length > 0 && (
            <div className="print-links">
              {project.links.map((link, j) => (
                <a
                  key={j}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="print-link"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
