"use client";

import { useEffect } from "react";
import type { Project } from "@/types";
import ArchSVG from "./ArchSVG";

type Props = {
  project: Project;
  onClose: () => void;
};

export default function ProjectModal({ project, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="m-meta">
          <span>{project.year}</span>
          {project.tags[0] && <span>{project.tags[0]}</span>}
        </div>
        <h2 className="m-title">{project.title}</h2>
        {project.desc && <p className="m-lede">{project.desc}</p>}
        <div className="m-hero">
          {project.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.image} alt="" />
          ) : (
            <div className="ph">
              <ArchSVG seed={project.id} />
            </div>
          )}
        </div>
        {project.body && (
          <div
            className="m-body"
            // body 는 관리자가 작성한 Tiptap HTML. 신뢰 가능한 단일 작성자라 sanitize 생략.
            dangerouslySetInnerHTML={{ __html: project.body }}
          />
        )}
        {project.tags.length > 0 && (
          <div className="m-stack">
            {project.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
        {project.links.length > 0 && (
          <div className="m-links">
            {project.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer">
                {l.label} <span>↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
