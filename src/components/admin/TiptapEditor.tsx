"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import ResizableImage from "./tiptap/ResizableImage";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j) => j?.error ?? "업로드 실패")
      .catch(() => "업로드 실패");
    throw new Error(typeof msg === "string" ? msg : "업로드 실패");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

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
      ResizableImage.configure({ inline: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "배경, 결정, 결과를 자유롭게…",
      }),
    ],
    content: value || "",
    editorProps: { attributes: { class: "tt-content" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  const onImageUrl = useCallback(() => {
    const url = window.prompt("이미지 URL", "https://");
    if (!url) return;
    editor
      .chain()
      .focus()
      .setImage({ src: url })
      .run();
  }, [editor]);

  const onImageFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError("");
      setUploading(true);
      try {
        const url = await uploadFile(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      } finally {
        setUploading(false);
      }
    },
    [editor],
  );

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
      {btn(
        uploading ? "⏳" : "🖼",
        false,
        () => fileRef.current?.click(),
        uploading ? "업로드 중…" : "이미지 업로드",
      )}
      {btn("🌐", false, onImageUrl, "이미지 URL")}
      <span className="sep" />
      {btn("↶", false, () => editor.chain().focus().undo().run(), "Undo")}
      {btn("↷", false, () => editor.chain().focus().redo().run(), "Redo")}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          onImageFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--danger, #c33)",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
