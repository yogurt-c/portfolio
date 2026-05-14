"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Variant = "list" | "form";

type Props = {
  title: string;
  variant: Variant;
};

export default function AdminBar({ title, variant }: Props) {
  const router = useRouter();

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="a-bar">
      <div className="a-title">
        <span className="dot" />
        <span>Admin</span>
        <b>{title}</b>
      </div>
      <div className="a-actions">
        {variant === "form" && (
          <Link className="btn btn-ghost" href="/admin">
            ← 목록
          </Link>
        )}
        {variant === "list" && (
          <>
            <Link className="btn btn-ghost" href="/admin/profile">
              프로필
            </Link>
            <Link className="btn btn-primary" href="/admin/projects/new">
              + 새 프로젝트
            </Link>
          </>
        )}
        <button className="btn btn-ghost" onClick={onLogout} title="로그아웃">
          로그아웃
        </button>
        <Link className="btn btn-ghost" href="/" title="사이트로 돌아가기">
          사이트 →
        </Link>
      </div>
    </div>
  );
}
