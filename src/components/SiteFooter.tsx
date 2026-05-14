"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "./AuthGate";

export default function SiteFooter() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const year = new Date().getFullYear();

  const onGearClick = async () => {
    // 이미 세션이 있으면 모달 건너뛰고 바로 진입.
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      router.push("/admin");
      return;
    }
    setShowAuth(true);
  };

  return (
    <>
      <footer className="site-ft">
        <div>© {year}</div>
        <button
          className="gear"
          onClick={onGearClick}
          aria-label="Admin settings"
          title="설정"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.15.68.39.94.7" />
          </svg>
        </button>
      </footer>
      {showAuth && (
        <AuthGate
          onSuccess={() => {
            setShowAuth(false);
            router.push("/admin");
          }}
          onCancel={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
