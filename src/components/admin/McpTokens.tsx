"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Toast from "./Toast";

type TokenSummary = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type CreatedToken = {
  id: string;
  label: string;
  plain: string;
  createdAt: string;
};

type SnippetTab = "code" | "desktop" | "web";

export default function McpTokens() {
  const [tokens, setTokens] = useState<TokenSummary[] | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [tab, setTab] = useState<SnippetTab>("code");
  const [toast, setToast] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/mcp-tokens", { cache: "no-store" });
    if (!res.ok) {
      setToast("토큰 목록을 불러오지 못했습니다.");
      return;
    }
    const data: TokenSummary[] = await res.json();
    setTokens(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/mcp-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setToast("토큰 발급 실패");
      return;
    }
    const data: CreatedToken = await res.json();
    setCreated(data);
    setLabel("");
    void load();
  };

  const onRevoke = async (id: string, lbl: string) => {
    if (!confirm(`토큰 "${lbl}" 을(를) 회수합니다. 해당 클라이언트는 즉시 인증이 끊깁니다. 진행할까요?`)) {
      return;
    }
    const res = await fetch(`/api/admin/mcp-tokens/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      setToast("회수 실패");
      return;
    }
    setToast("토큰을 회수했습니다.");
    void load();
  };

  const endpoint = origin ? `${origin}/api/mcp` : "/api/mcp";

  return (
    <div className="mcp-wrap">
      <section className="mcp-card">
        <h3 className="mcp-h">새 토큰 발급</h3>
        <p className="mcp-help">
          기기/클라이언트별로 라벨을 다르게 발급하면, 토큰 유출 시 해당 라벨만 회수할 수 있습니다.
        </p>
        <form className="mcp-form" onSubmit={onCreate}>
          <input
            className="mcp-input"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: laptop-claude-code"
            maxLength={60}
            required
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy || !label.trim()}
          >
            {busy ? "발급 중…" : "발급"}
          </button>
        </form>
      </section>

      <section className="mcp-card">
        <h3 className="mcp-h">활성 토큰</h3>
        {tokens === null ? (
          <div className="mcp-empty">로딩…</div>
        ) : tokens.length === 0 ? (
          <div className="mcp-empty">아직 발급된 토큰이 없습니다.</div>
        ) : (
          <table className="mcp-table">
            <thead>
              <tr>
                <th>라벨</th>
                <th>발급</th>
                <th>마지막 사용</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className={t.revokedAt ? "revoked" : undefined}>
                  <td className="mcp-label">{t.label}</td>
                  <td>{fmtDate(t.createdAt)}</td>
                  <td>{t.lastUsedAt ? fmtDate(t.lastUsedAt) : "—"}</td>
                  <td>
                    {t.revokedAt ? (
                      <span className="mcp-badge revoked">회수됨</span>
                    ) : (
                      <span className="mcp-badge active">활성</span>
                    )}
                  </td>
                  <td className="mcp-actions">
                    {!t.revokedAt && (
                      <button
                        className="btn btn-ghost btn-sm danger"
                        onClick={() => onRevoke(t.id, t.label)}
                      >
                        회수
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mcp-card">
        <h3 className="mcp-h">엔드포인트</h3>
        <CopyBlock value={endpoint} />
        <p className="mcp-help">
          헬스 체크:{" "}
          <code className="mcp-inline">
            curl -H &quot;Authorization: Bearer &lt;TOKEN&gt;&quot; {endpoint}/health
          </code>
        </p>
      </section>

      {created && (
        <div className="mcp-modal-backdrop" onClick={() => setCreated(null)}>
          <div className="mcp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mcp-modal-hd">
              <strong>발급 완료 — {created.label}</strong>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCreated(null)}
              >
                닫기
              </button>
            </div>

            <div className="mcp-warn">
              이 토큰은 <b>이번 한 번만 표시</b>됩니다. 지금 안전한 곳에 복사하세요.
            </div>

            <div className="mcp-token-row">
              <CopyBlock value={created.plain} mono />
            </div>

            <div className="mcp-tabs">
              {(["code", "desktop", "web"] as const).map((k) => (
                <button
                  key={k}
                  className={`mcp-tab ${tab === k ? "on" : ""}`}
                  onClick={() => setTab(k)}
                >
                  {labelOfTab(k)}
                </button>
              ))}
            </div>

            <div className="mcp-snippet">
              <Snippet tab={tab} endpoint={endpoint} token={created.plain} />
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

function labelOfTab(t: SnippetTab): string {
  switch (t) {
    case "code":
      return "Claude Code (CLI)";
    case "desktop":
      return "Claude Desktop";
    case "web":
      return "claude.ai 웹";
  }
}

function Snippet({
  tab,
  endpoint,
  token,
}: {
  tab: SnippetTab;
  endpoint: string;
  token: string;
}) {
  const text = useMemo(() => buildSnippet(tab, endpoint, token), [tab, endpoint, token]);
  return <CopyBlock value={text} block />;
}

function buildSnippet(tab: SnippetTab, endpoint: string, token: string): string {
  switch (tab) {
    case "code":
      return [
        `claude mcp add --transport http portfolio \\`,
        `  ${endpoint} \\`,
        `  --header "Authorization: Bearer ${token}"`,
      ].join("\n");
    case "desktop":
      return JSON.stringify(
        {
          mcpServers: {
            portfolio: {
              command: "npx",
              args: [
                "-y",
                "mcp-remote",
                endpoint,
                "--header",
                `Authorization: Bearer ${token}`,
              ],
            },
          },
        },
        null,
        2,
      );
    case "web":
      return [
        `Custom Connector 설정 (claude.ai → Settings → Connectors → Add custom connector)`,
        ``,
        `URL: ${endpoint}`,
        `Header name:  Authorization`,
        `Header value: Bearer ${token}`,
      ].join("\n");
  }
}

function CopyBlock({
  value,
  block,
  mono,
}: {
  value: string;
  block?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // 무시: 일부 브라우저는 권한 없으면 실패
    }
  };
  return (
    <div className={`mcp-copy ${block ? "block" : ""} ${mono ? "mono" : ""}`}>
      <pre>{value}</pre>
      <button className="btn btn-ghost btn-sm" onClick={onCopy} type="button">
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}

function fmtDate(s: string): string {
  const d = new Date(s);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
