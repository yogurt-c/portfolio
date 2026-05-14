"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/types";
import ArchSVG from "./ArchSVG";

type Props = {
  project: Project;
  onClose: () => void;
};

export default function ProjectModal({ project, onClose }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, lightbox]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && (target as HTMLImageElement).src) {
        setLightbox((target as HTMLImageElement).src);
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [project.body]);

  return (
    <>
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
          {project.period && <span>{project.period}</span>}
          {project.tags[0] && <span>{project.tags[0]}</span>}
        </div>
        <h2 className="m-title">{project.title}</h2>
        {project.desc && <p className="m-lede">{project.desc}</p>}
        <div className="m-hero">
          {project.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.image}
              alt=""
              className="zoomable"
              onClick={() => setLightbox(project.image)}
            />
          ) : (
            <div className="ph">
              <ArchSVG seed={project.id} />
            </div>
          )}
        </div>
        {project.body && (
          <div
            ref={bodyRef}
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
    {lightbox && (
      <div className="lightbox-scrim" onClick={() => setLightbox(null)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        <button
          className="lightbox-close"
          onClick={() => setLightbox(null)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    )}
    </>
  );
}
