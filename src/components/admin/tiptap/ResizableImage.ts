import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ResizableImageView from "./ResizableImageView";

export type ImageAlign = "left" | "center" | "right";

// 본문 이미지: width(%) + align(left/center/right) 속성을 가진 확장.
// HTML round-trip 시 width 는 인라인 style="width: NN%", align 은 data-align 으로 저장.
const ResizableImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as string | null,
        parseHTML: (el) => {
          const style = el.getAttribute("style") ?? "";
          const m = style.match(/width:\s*([^;]+)/i);
          if (m) return m[1].trim();
          const w = el.getAttribute("width");
          return w ? w : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { style: `width: ${attrs.width}` };
        },
      },
      align: {
        default: "center" as ImageAlign,
        parseHTML: (el) => (el.getAttribute("data-align") as ImageAlign) ?? "center",
        renderHTML: (attrs) => {
          if (!attrs.align) return {};
          return { "data-align": attrs.align };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;
