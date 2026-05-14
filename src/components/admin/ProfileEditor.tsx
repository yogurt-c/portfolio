"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";
import Toast from "./Toast";

export default function ProfileEditor({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [f, setF] = useState<Profile>(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(f),
    });
    setBusy(false);
    if (!res.ok) {
      setToast("저장 실패");
      return;
    }
    setToast("프로필이 저장되었습니다.");
    router.refresh();
  };

  return (
    <form className="editor" onSubmit={save}>
      <h2 className="e-title">프로필</h2>
      <div className="e-sub">사이트 헤더에 표시되는 정보</div>

      <div className="fld">
        <label>이름</label>
        <input
          type="text"
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="fld">
        <label>역할 / 한 줄</label>
        <input
          type="text"
          value={f.role}
          onChange={(e) => set("role", e.target.value)}
        />
      </div>
      <div className="fld">
        <label>소개</label>
        <textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} />
      </div>
      <div className="fld-row">
        <div className="fld">
          <label>이메일</label>
          <input
            type="text"
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="fld">
          <label>위치</label>
          <input
            type="text"
            value={f.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
      </div>
      <div className="fld">
        <label>GitHub</label>
        <input
          type="text"
          value={f.github}
          onChange={(e) => set("github", e.target.value)}
        />
      </div>

      <div className="e-foot">
        <span />
        <div className="right">
          <button
            type="button"
            className="btn"
            onClick={() => router.push("/admin")}
            disabled={busy}
          >
            돌아가기
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
