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

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel"];

export function sanitizeBody(html: string): string {
  if (!html) return "";
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // DOMPurify 의 기본 URI 필터가 javascript:, data:text/html 등을 차단.
    // a, img 의 src/href 는 그 필터를 그대로 통과.
  });
  return typeof clean === "string" ? clean : String(clean);
}
