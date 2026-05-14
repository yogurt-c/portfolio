// id 시드 기반의 결정론적 도식 일러스트 (이미지 없을 때 카드 썸네일/모달 히어로용).
// 동일 id 는 항상 같은 그림.
export default function ArchSVG({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  let r = h;
  const rand = () => {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    return r / 0x7fffffff;
  };

  const variants = ["fan", "pipeline", "mesh"] as const;
  const v = variants[Math.abs(h) % variants.length];
  const stroke = "currentColor";

  if (v === "fan") {
    return (
      <svg
        viewBox="0 0 240 150"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ color: "var(--fg-mute)", opacity: 0.55 }}
        aria-hidden="true"
      >
        <g fill="none" stroke={stroke} strokeWidth="1">
          {[40, 70, 100, 130].map((y, i) => (
            <line key={i} x1="50" y1={y} x2="120" y2="75" />
          ))}
          {[40, 75, 110].map((y, i) => (
            <line key={`r${i}`} x1="120" y1="75" x2="200" y2={y} />
          ))}
        </g>
        <g fill="var(--bg-elev)" stroke={stroke}>
          {[40, 70, 100, 130].map((y, i) => (
            <rect key={i} x="32" y={y - 7} width="36" height="14" rx="1" />
          ))}
          {[40, 75, 110].map((y, i) => (
            <rect key={`r${i}`} x="184" y={y - 7} width="32" height="14" rx="1" />
          ))}
        </g>
        <circle
          cx="120"
          cy="75"
          r="10"
          fill="var(--accent)"
          stroke="none"
          opacity="0.85"
        />
        <circle cx="120" cy="75" r="16" fill="none" stroke={stroke} strokeDasharray="2 3" />
      </svg>
    );
  }

  if (v === "pipeline") {
    return (
      <svg
        viewBox="0 0 240 150"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ color: "var(--fg-mute)", opacity: 0.55 }}
        aria-hidden="true"
      >
        <g fill="none" stroke={stroke} strokeWidth="1">
          <line x1="46" y1="75" x2="200" y2="75" />
          <line x1="120" y1="40" x2="120" y2="110" strokeDasharray="2 3" />
        </g>
        <g fill="var(--bg-elev)" stroke={stroke}>
          <rect x="20" y="62" width="40" height="26" rx="1" />
          <rect x="80" y="62" width="40" height="26" rx="1" />
          <rect x="140" y="62" width="40" height="26" rx="1" />
          <rect x="194" y="62" width="36" height="26" rx="1" />
        </g>
        <rect x="105" y="20" width="30" height="14" fill="var(--accent)" opacity="0.85" />
        <rect x="105" y="116" width="30" height="14" fill="none" stroke={stroke} strokeDasharray="2 2" />
      </svg>
    );
  }

  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    nodes.push({ x: 30 + rand() * 180, y: 25 + rand() * 100 });
  }
  return (
    <svg
      viewBox="0 0 240 150"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ color: "var(--fg-mute)", opacity: 0.55 }}
      aria-hidden="true"
    >
      <g fill="none" stroke={stroke} strokeWidth="0.75" opacity="0.7">
        {nodes.flatMap((n, i) =>
          nodes.slice(i + 1).map((m, j) => {
            const d = Math.hypot(n.x - m.x, n.y - m.y);
            return d < 90 ? (
              <line key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} />
            ) : null;
          }),
        )}
      </g>
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i === 0 ? 5 : 3.2}
          fill={i === 0 ? "var(--accent)" : "var(--bg-elev)"}
          stroke={stroke}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
