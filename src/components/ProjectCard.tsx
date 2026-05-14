"use client";

import type { Project } from "@/types";
import ArchSVG from "./ArchSVG";

type Props = {
  project: Project;
  index: number;
  onOpen: (p: Project) => void;
};

export default function ProjectCard({ project, index, onOpen }: Props) {
  return (
    <article
      className="card"
      tabIndex={0}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(project);
        }
      }}
      role="button"
      aria-label={`Open ${project.title}`}
    >
      <div className="thumb">
        {project.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.image} alt="" />
        ) : (
          <ArchSVG seed={project.id} />
        )}
      </div>
      <div className="meta">
        <span className="idx">[ {String(index + 1).padStart(2, "0")} ]</span>
        <span className="yr">{project.year}</span>
      </div>
      <h2 className="title">{project.title}</h2>
      <p className="desc">{project.desc}</p>
      <span className="arrow">↗</span>
    </article>
  );
}
