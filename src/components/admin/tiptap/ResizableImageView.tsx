"use client";

import { useCallback, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { ImageAlign } from "./ResizableImage";

const MIN_WIDTH_PCT = 10;
const MAX_WIDTH_PCT = 100;

function parsePctWidth(w: unknown): number {
  if (typeof w !== "string") return 100;
  const m = w.match(/^([\d.]+)\s*%$/);
  if (m) {
    const n = parseFloat(m[1]);
    if (!Number.isNaN(n)) return clamp(n);
  }
  return 100;
}

function clamp(n: number) {
  return Math.max(MIN_WIDTH_PCT, Math.min(MAX_WIDTH_PCT, Math.round(n)));
}

export default function ResizableImageView({
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) ?? "";
  const align = (node.attrs.align as ImageAlign) ?? "center";
  const widthPct = parsePctWidth(node.attrs.width ?? "100%");

  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startWidthPct: number;
    parentWidth: number;
  } | null>(null);

  const setAlign = useCallback(
    (a: ImageAlign) => updateAttributes({ align: a }),
    [updateAttributes],
  );

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const parent = wrap.parentElement;
      const parentWidth = parent?.getBoundingClientRect().width ?? 1;

      dragRef.current = {
        startX: e.clientX,
        startWidthPct: widthPct,
        parentWidth,
      };
      setDragging(true);
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [widthPct],
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaPx = e.clientX - d.startX;
      const deltaPct = (deltaPx / d.parentWidth) * 100;
      // 좌측 정렬일 땐 오른쪽으로 끌면 커지고, 우측 정렬일 땐 왼쪽으로 끌면 커지고,
      // 가운데 정렬일 땐 절반만 반영. 자연스러운 핸들 동작.
      const sign = align === "right" ? -1 : 1;
      const scale = align === "center" ? 2 : 1;
      const next = clamp(d.startWidthPct + deltaPct * sign * scale);
      updateAttributes({ width: `${next}%` });
    },
    [align, updateAttributes],
  );

  const onResizeEnd = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    setDragging(false);
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <NodeViewWrapper
      ref={wrapperRef as unknown as React.Ref<HTMLDivElement>}
      as="div"
      className={`ri-wrap ri-align-${align}${selected ? " is-selected" : ""}`}
      data-drag-handle
    >
      <div className="ri-box" style={{ width: `${widthPct}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} draggable={false} />

        {selected && (
          <>
            <div className="ri-toolbar" contentEditable={false}>
              <button
                type="button"
                className={align === "left" ? "on" : ""}
                onClick={() => setAlign("left")}
                title="왼쪽"
              >
                ⬛◻◻
              </button>
              <button
                type="button"
                className={align === "center" ? "on" : ""}
                onClick={() => setAlign("center")}
                title="가운데"
              >
                ◻⬛◻
              </button>
              <button
                type="button"
                className={align === "right" ? "on" : ""}
                onClick={() => setAlign("right")}
                title="오른쪽"
              >
                ◻◻⬛
              </button>
              <span className="ri-sep" />
              <span className="ri-w">{widthPct}%</span>
            </div>

            <span
              className={`ri-handle${dragging ? " is-active" : ""}`}
              contentEditable={false}
              onPointerDown={onResizeStart}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeEnd}
              onPointerCancel={onResizeEnd}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
