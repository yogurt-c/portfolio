"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectInput, ProjectLink } from "@/types";
import TiptapEditor from "./TiptapEditor";
import TagsInput from "./TagsInput";
import LinksEditor from "./LinksEditor";
import ImagePicker from "./ImagePicker";
import Toast from "./Toast";

type Props = {
  initial: Project | null;
};

const blank = (): ProjectInput => ({
  title: "",
  period: "",
  desc: "",
  body: "",
  image: "",
  tags: [],
  links: [],
});

// "2024.01 ~ 2025.03" → { start: "2024-01", end: "2025-03" } (month input 포맷)
function parsePeriod(s: string): { start: string; end: string } {
  if (!s) return { start: "", end: "" };
  const [rawStart = "", rawEnd = ""] = s.split("~").map((x) => x.trim());
  const toMonth = (p: string) => {
    const m = p.match(/^(\d{4})\.(\d{2})$/);
    return m ? `${m[1]}-${m[2]}` : "";
  };
  return { start: toMonth(rawStart), end: toMonth(rawEnd) };
}

// month input("2024-01") 두 값을 "yyyy.mm ~ yyyy.mm" 로 합침. 한쪽만 있으면 그쪽만.
function formatPeriod(start: string, end: string): string {
  const fmt = (m: string) => (m ? m.replace("-", ".") : "");
  const s = fmt(start);
  const e = fmt(end);
  if (!s && !e) return "";
  if (s && e) return `${s} ~ ${e}`;
  if (s) return `${s} ~`;
  return `~ ${e}`;
}

export default function ProjectEditor({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectInput>(
    initial
      ? {
          title: initial.title,
          period: initial.period,
          desc: initial.desc,
          body: initial.body,
          image: initial.image,
          tags: initial.tags,
          links: initial.links,
        }
      : blank(),
  );
  const initialParts = parsePeriod(form.period);
  const [periodStart, setPeriodStart] = useState(initialParts.start);
  const [periodEnd, setPeriodEnd] = useState(initialParts.end);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("제목을 입력해 주세요.");
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      desc: form.desc.trim(),
      body: form.body,
      period: formatPeriod(periodStart, periodEnd),
      links: form.links.filter(
        (l: ProjectLink) => l.label.trim() && l.url.trim(),
      ),
    };

    const res = initial
      ? await fetch(`/api/projects/${initial.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

    setBusy(false);
    if (!res.ok) {
      setToast("저장 실패");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <form className="editor" onSubmit={submit}>
      <h2 className="e-title">{initial ? "프로젝트 편집" : "새 프로젝트"}</h2>
      <div className="e-sub">{initial ? `ID · ${initial.id}` : "New entry"}</div>

      <div className="fld">
        <label>제목</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="예) 결제 시스템 아키텍처 개편"
        />
      </div>

      <div className="fld-row">
        <div className="fld">
          <label>기간</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="month"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{ flex: 1 }}
            />
            <span style={{ color: "var(--fg-dim)" }}>~</span>
            <input
              type="month"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <div className="fld">
          <label>한 줄 설명</label>
          <input
            type="text"
            value={form.desc}
            onChange={(e) => update("desc", e.target.value)}
            placeholder="카드에 표시될 1줄 요약"
          />
        </div>
      </div>

      <div className="fld">
        <label>썸네일 이미지</label>
        <ImagePicker value={form.image} onChange={(v) => update("image", v)} />
      </div>

      <div className="fld">
        <label>상세 설명 (모달 본문)</label>
        <TiptapEditor value={form.body} onChange={(html) => update("body", html)} />
        <div className="hint" style={{ marginTop: 6 }}>
          서식·헤딩·코드 블록·이미지 지원. 작성 시점의 HTML 그대로 저장됩니다.
        </div>
      </div>

      <div className="fld">
        <label>기술 스택 / 태그</label>
        <TagsInput value={form.tags} onChange={(v) => update("tags", v)} />
      </div>

      <div className="fld">
        <label>외부 링크</label>
        <LinksEditor value={form.links} onChange={(v) => update("links", v)} />
      </div>

      <div className="e-foot">
        <div
          className="hint"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-dim)",
            letterSpacing: ".06em",
          }}
        >
          {initial ? "변경 사항을 저장합니다." : "새 항목이 목록 최상단에 추가됩니다."}
        </div>
        <div className="right">
          <button
            type="button"
            className="btn"
            onClick={() => router.push("/admin")}
            disabled={busy}
          >
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </form>
  );
}
