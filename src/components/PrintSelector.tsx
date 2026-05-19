"use client";

import { useState, useCallback } from "react";
import type { Project } from "@/types";
import ArchSVG from "./ArchSVG";

export default function PrintSelector({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(projects.map((p) => p.id)),
  );

  const allSelected = selected.size === projects.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected || someSelected) {
      setSelected(new Set(projects.map((p) => p.id)));
    } else {
      setSelected(new Set());
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onPrint = useCallback(() => {
    if (selected.size === 0) return;
    const orderedIds = projects
      .filter((p) => selected.has(p.id))
      .map((p) => p.id);
    const query =
      orderedIds.length === projects.length
        ? ""
        : `?ids=${orderedIds.join(",")}`;
    window.open(`/print${query}`, "_blank");
    setOpen(false);
  }, [selected, projects]);

  return (
    <>
      <button
        className="ps-fab no-print"
        onClick={() => setOpen(true)}
        aria-label="PDF 출력"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        PDF 출력
      </button>

      {open && (
        <div className="ps-scrim" onClick={() => setOpen(false)}>
          <div
            className="ps-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="인쇄할 프로젝트 선택"
          >
            <div className="ps-head">
              <span>인쇄할 프로젝트 선택</span>
              <button
                className="ps-close"
                onClick={() => setOpen(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <label className="ps-all">
              <input
                type="checkbox"
                className="ps-check"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
              />
              <span>전체 선택</span>
              <span className="ps-count">
                {selected.size} / {projects.length}
              </span>
            </label>

            <div className="ps-divider" />

            <div className="ps-list">
              {projects.map((project, i) => (
                <label key={project.id} className="ps-item">
                  <input
                    type="checkbox"
                    className="ps-check"
                    checked={selected.has(project.id)}
                    onChange={() => toggle(project.id)}
                  />
                  <div className="ps-thumb">
                    {project.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.image} alt="" />
                    ) : (
                      <ArchSVG seed={project.id} />
                    )}
                  </div>
                  <div className="ps-info">
                    <span className="ps-title">{project.title}</span>
                    {project.period && (
                      <span className="ps-period">{project.period}</span>
                    )}
                  </div>
                  <span className="ps-idx">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </label>
              ))}
            </div>

            <div className="ps-foot">
              <button className="ps-cancel" onClick={() => setOpen(false)}>
                취소
              </button>
              <button
                className="ps-confirm"
                onClick={onPrint}
                disabled={selected.size === 0}
              >
                인쇄 ({selected.size}개 선택)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
