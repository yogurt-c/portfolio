import DOMPurify from "isomorphic-dompurify";

// Tiptap 이 생성하는 HTML 의 안전 부분집합만 허용.
// 관리자 계정 탈취 시에도 임의 스크립트 주입을 막기 위한 두 번째 방어선.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "u",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "img",
];

const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "target",
  "rel",
  // img 한정 — width 인라인 스타일, 정렬은 data-align.
  "style",
  "data-align",
];

const WIDTH_STYLE_RE = /^width:\s*(\d{1,3}(?:\.\d+)?%)\s*;?\s*$/i;
const ALIGN_VALUES = new Set(["left", "center", "right"]);

// 한 번만 후크 등록 (모듈 평가 시점). DOMPurify 는 전역 인스턴스.
let hooksRegistered = false;
function ensureHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    const tag = (node as Element).tagName?.toLowerCase();

    if (data.attrName === "style") {
      // img 의 width: NN% 만 통과. 그 외 모든 style 제거.
      if (tag !== "img" || !WIDTH_STYLE_RE.test(data.attrValue)) {
        data.keepAttr = false;
      }
      return;
    }

    if (data.attrName === "data-align") {
      if (tag !== "img" || !ALIGN_VALUES.has(data.attrValue)) {
        data.keepAttr = false;
      }
    }
  });
}

export function sanitizeBody(html: string): string {
  if (!html) return "";
  ensureHooks();
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // DOMPurify 의 기본 URI 필터가 javascript:, data:text/html 등을 차단.
    // a, img 의 src/href 는 그 필터를 그대로 통과.
  });
  return typeof clean === "string" ? clean : String(clean);
}
