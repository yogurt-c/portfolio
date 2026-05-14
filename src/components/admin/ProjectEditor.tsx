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
  year: new Date().getFullYear(),
  desc: "",
  body: "",
  image: "",
  tags: [],
  links: [],
});

export default function ProjectEditor({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectInput>(
    initial
      ? {
          title: initial.title,
          year: initial.year,
          desc: initial.desc,
          body: initial.body,
          image: initial.image,
          tags: initial.tags,
          links: initial.links,
        }
      : blank(),
  );
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
      year: Number(form.year) || new Date().getFullYear(),
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
          <label>연도</label>
          <input
            type="number"
            value={form.year}
            min={2000}
            max={2100}
            onChange={(e) => update("year", Number(e.target.value))}
          />
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
