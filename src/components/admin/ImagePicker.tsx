"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j) => j?.error ?? "업로드 실패")
      .catch(() => "업로드 실패");
    throw new Error(typeof msg === "string" ? msg : "업로드 실패");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export default function ImagePicker({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="img-picker">
      <div className="preview">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" />
        ) : (
          <span>NO IMAGE</span>
        )}
      </div>
      <div className="pcol">
        <input
          type="url"
          placeholder="이미지 URL (https://...)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
        />
        <div className="row">
          <label
            className="btn btn-ghost"
            style={{ cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "업로드 중…" : "파일 업로드"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              disabled={busy}
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {value && !busy && (
            <button
              type="button"
              className="btn btn-ghost btn-danger"
              onClick={() => onChange("")}
            >
              제거
            </button>
          )}
        </div>
        <div className="hint">
          {error ? (
            <span style={{ color: "var(--danger, #c33)" }}>{error}</span>
          ) : (
            "JPG/PNG/WEBP/GIF/AVIF · 최대 4MB"
          )}
        </div>
      </div>
    </div>
  );
}
