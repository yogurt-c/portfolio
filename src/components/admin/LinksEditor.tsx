"use client";

import type { ProjectLink } from "@/types";

type Props = {
  value: ProjectLink[];
  onChange: (next: ProjectLink[]) => void;
};

export default function LinksEditor({ value, onChange }: Props) {
  const update = (i: number, k: keyof ProjectLink, v: string) => {
    onChange(value.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  };
  const add = () => onChange([...value, { label: "", url: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <>
      {value.map((l, i) => (
        <div className="fld-row" key={i} style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="라벨 (예: Case study)"
            value={l.label}
            onChange={(e) => update(i, "label", e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="url"
              placeholder="https://..."
              value={l.url}
              onChange={(e) => update(i, "url", e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-danger"
              onClick={() => remove(i)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost"
        onClick={add}
        style={{ alignSelf: "flex-start", marginTop: 4 }}
      >
        + 링크 추가
      </button>
    </>
  );
}
