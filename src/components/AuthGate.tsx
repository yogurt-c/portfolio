"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export default function AuthGate({ onSuccess, onCancel }: Props) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) {
      onSuccess();
    } else {
      setErr("비밀번호가 올바르지 않습니다.");
      setPw("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="modal-scrim" onClick={onCancel}>
      <form className="auth" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Restricted · 비밀번호 입력</h3>
        <input
          ref={inputRef}
          className="field"
          type="password"
          placeholder="••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          disabled={busy}
        />
        <div className="err">{err || " "}</div>
        <div className="row">
          <span className="hint">관리자만 사용</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !pw}>
              {busy ? "확인 중…" : "Enter →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
