"use client";

import { useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export default function TiptapEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { spellcheck: "false" } },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "배경, 결정, 결과를 자유롭게…",
      }),
    ],
    content: value || "",
    editorProps: { attributes: { class: "tt-content" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    // App Router / SSR 환경에서 hydration mismatch 방지.
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className="tt-wrap">
        <div className="tt-content" />
      </div>
    );
  }

  return (
    <div className="tt-wrap">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const onLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const onImage = useCallback(() => {
    const url = window.prompt("이미지 URL", "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const btn = (label: string, isOn: boolean, onClick: () => void, title?: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={isOn ? "on" : ""}
    >
      {label}
    </button>
  );

  return (
    <div className="tt-bar">
      {btn("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold")}
      {btn(
        "I",
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        "Italic",
      )}
      {btn(
        "S",
        editor.isActive("strike"),
        () => editor.chain().focus().toggleStrike().run(),
        "Strikethrough",
      )}
      <span className="sep" />
      {btn(
        "H2",
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {btn(
        "H3",
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      <span className="sep" />
      {btn(
        "•",
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "Bullet list",
      )}
      {btn(
        "1.",
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "Ordered list",
      )}
      {btn(
        "❝",
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        "Blockquote",
      )}
      <span className="sep" />
      {btn(
        "‹›",
        editor.isActive("code"),
        () => editor.chain().focus().toggleCode().run(),
        "Inline code",
      )}
      {btn(
        "{ }",
        editor.isActive("codeBlock"),
        () => editor.chain().focus().toggleCodeBlock().run(),
        "Code block",
      )}
      <span className="sep" />
      {btn("🔗", editor.isActive("link"), onLink, "Link")}
      {btn("🖼", false, onImage, "Image")}
      <span className="sep" />
      {btn("↶", false, () => editor.chain().focus().undo().run(), "Undo")}
      {btn("↷", false, () => editor.chain().focus().redo().run(), "Redo")}
    </div>
  );
}
