import sanitizeHtml from "sanitize-html";

// Tiptap이 생성하는 HTML의 안전 부분집합만 허용.
// 관리자 계정 탈취 시에도 임의 스크립트 주입을 막기 위한 두 번째 방어선.
export function sanitizeBody(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "s", "u",
      "h2", "h3", "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "img",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: [
        "src", "alt", "title",
        // width: NN% 형식의 인라인 스타일만 허용 (allowedStyles로 검증)
        "style",
        // left / center / right 값만 허용
        { name: "data-align", values: ["left", "center", "right"] },
      ],
    },
    // img의 width 퍼센트 스타일만 통과
    allowedStyles: {
      img: {
        width: [/^\d{1,3}(?:\.\d+)?%$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
  });
}
