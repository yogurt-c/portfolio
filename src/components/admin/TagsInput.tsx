"use client";

import { useState } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export default function TagsInput({ value, onChange, placeholder }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const t = input.trim();
    if (!t) return;
    if (value.includes(t)) {
      setInput("");
      return;
    }
    onChange([...value, t]);
    setInput("");
  };

  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  return (
    <div className="tags-edit">
      {value.map((t) => (
        <span key={t} className="pill">
          {t}{" "}
          <button type="button" onClick={() => remove(t)} aria-label="remove">
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !input && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={
          placeholder ?? (value.length === 0 ? "Java, Spring Boot, Postgres…" : "추가…")
        }
      />
    </div>
  );
}
