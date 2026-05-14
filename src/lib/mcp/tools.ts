import { z } from "zod";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { serializeProject } from "@/lib/project";
import { sanitizeBody } from "@/lib/sanitize";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  collectBlobUrls,
  deleteOrphans,
  extByMime,
} from "@/lib/blob";
import {
  projectInputSchema,
  profileInputSchema,
  reorderSchema,
} from "@/lib/validation";

// MCP 툴 정의. inputSchema 는 JSON Schema 형식 (MCP 스펙). 런타임 검증은 Zod.
export type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

// 응답 콘텐츠 — MCP 스펙의 tool result content. 단순 JSON 텍스트로 직렬화.
type ContentItem = { type: "text"; text: string };
type ToolResult = { content: ContentItem[]; isError?: boolean };

function json(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string, extra?: Record<string, unknown>): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: message, ...extra }, null, 2),
      },
    ],
    isError: true,
  };
}

// 개별 툴: name → { def, handler }
type ToolEntry = {
  def: Tool;
  handler: (input: unknown) => Promise<ToolResult>;
};

const projectInputJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    year: { type: "integer", minimum: 1990, maximum: 2100 },
    desc: { type: "string", maxLength: 400, default: "" },
    body: {
      type: "string",
      maxLength: 50000,
      description: "Tiptap-compatible HTML. 허용 태그만 자동 sanitize 됨.",
      default: "",
    },
    image: {
      type: "string",
      description: "썸네일 이미지 URL. 빈 문자열 또는 절대 URL.",
      default: "",
    },
    tags: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 40 },
      maxItems: 40,
      default: [],
    },
    links: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string", minLength: 1, maxLength: 60 },
          url: { type: "string", minLength: 1, maxLength: 500 },
        },
        required: ["label", "url"],
        additionalProperties: false,
      },
      maxItems: 20,
      default: [],
    },
  },
  required: ["title", "year"],
  additionalProperties: false,
} as const;

const profileInputJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1, maxLength: 120 },
    role: { type: "string", maxLength: 200, default: "" },
    bio: { type: "string", maxLength: 2000, default: "" },
    email: { type: "string", maxLength: 200, default: "" },
    github: { type: "string", maxLength: 200, default: "" },
    location: { type: "string", maxLength: 120, default: "" },
  },
  required: ["name"],
  additionalProperties: false,
} as const;

const TOOLS: ToolEntry[] = [
  {
    def: {
      name: "list_projects",
      description: "포트폴리오의 모든 프로젝트를 position 오름차순으로 반환합니다.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: async () => {
      const rows = await prisma.project.findMany({ orderBy: { position: "asc" } });
      return json(rows.map(serializeProject));
    },
  },
  {
    def: {
      name: "get_project",
      description: "id 로 단일 프로젝트를 조회합니다.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", minLength: 1 } },
        required: ["id"],
        additionalProperties: false,
      },
    },
    handler: async (input) => {
      const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
      if (!parsed.success) return errorResult("invalid input");
      const row = await prisma.project.findUnique({ where: { id: parsed.data.id } });
      if (!row) return errorResult("not found");
      return json(serializeProject(row));
    },
  },
  {
    def: {
      name: "create_project",
      description:
        "새 프로젝트를 생성합니다. 목록 최상단(position 0)에 배치되고 기존 항목은 한 칸씩 밀립니다.",
      inputSchema: projectInputJsonSchema as unknown as Record<string, unknown>,
    },
    handler: async (input) => {
      const parsed = projectInputSchema.safeParse(input);
      if (!parsed.success) {
        return errorResult("invalid input", { issues: parsed.error.flatten() });
      }
      const data = parsed.data;
      const created = await prisma.$transaction(async (tx) => {
        await tx.project.updateMany({ data: { position: { increment: 1 } } });
        return tx.project.create({
          data: {
            title: data.title,
            year: data.year,
            desc: data.desc,
            body: sanitizeBody(data.body),
            image: data.image,
            tags: data.tags,
            links: data.links,
            position: 0,
          },
        });
      });
      return json(serializeProject(created));
    },
  },
  {
    def: {
      name: "update_project",
      description:
        "id 로 프로젝트를 수정합니다. body/image 가 바뀌면 더 이상 참조되지 않는 Vercel Blob 도 best-effort 로 정리됩니다.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          ...projectInputJsonSchema.properties,
        },
        required: ["id", "title", "year"],
        additionalProperties: false,
      },
    },
    handler: async (input) => {
      const parsedId = z.object({ id: z.string().min(1) }).safeParse(input);
      if (!parsedId.success) return errorResult("invalid id");
      const parsed = projectInputSchema.safeParse(input);
      if (!parsed.success) {
        return errorResult("invalid input", { issues: parsed.error.flatten() });
      }
      const { id } = parsedId.data;
      const data = parsed.data;
      const before = await prisma.project.findUnique({ where: { id } });
      if (!before) return errorResult("not found");

      const cleanBody = sanitizeBody(data.body);
      const updated = await prisma.project.update({
        where: { id },
        data: {
          title: data.title,
          year: data.year,
          desc: data.desc,
          body: cleanBody,
          image: data.image,
          tags: data.tags,
          links: data.links,
        },
      });
      const oldUrls = collectBlobUrls(before.image, before.body);
      const newUrls = collectBlobUrls(updated.image, updated.body);
      void deleteOrphans(oldUrls, newUrls);
      return json(serializeProject(updated));
    },
  },
  {
    def: {
      name: "delete_project",
      description:
        "id 로 프로젝트를 삭제합니다. 파괴적 작업이므로 confirm 을 true 로 명시해야 실행됩니다.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          confirm: {
            type: "boolean",
            description: "삭제를 확정하려면 true. 누락 시 미리보기만 반환.",
            default: false,
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    handler: async (input) => {
      const parsed = z
        .object({ id: z.string().min(1), confirm: z.boolean().optional() })
        .safeParse(input);
      if (!parsed.success) return errorResult("invalid input");
      const { id, confirm } = parsed.data;
      const before = await prisma.project.findUnique({ where: { id } });
      if (!before) return errorResult("not found");
      if (!confirm) {
        return json({
          preview: serializeProject(before),
          note: "이 프로젝트를 삭제하려면 confirm: true 로 다시 호출하세요.",
        });
      }
      await prisma.project.delete({ where: { id } });
      void deleteOrphans(collectBlobUrls(before.image, before.body), []);
      return json({ ok: true, deletedId: id });
    },
  },
  {
    def: {
      name: "reorder_projects",
      description: "id 배열을 받아 그 순서대로 position 을 재할당합니다.",
      inputSchema: {
        type: "object",
        properties: {
          order: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 1,
          },
        },
        required: ["order"],
        additionalProperties: false,
      },
    },
    handler: async (input) => {
      const parsed = reorderSchema.safeParse(input);
      if (!parsed.success) return errorResult("invalid order");
      const { order } = parsed.data;
      await prisma.$transaction(
        order.map((id, idx) =>
          prisma.project.update({ where: { id }, data: { position: idx } }),
        ),
      );
      const rows = await prisma.project.findMany({ orderBy: { position: "asc" } });
      return json({ count: rows.length });
    },
  },
  {
    def: {
      name: "get_profile",
      description: "포트폴리오 헤더에 표시되는 프로필 정보를 조회합니다.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    handler: async () => {
      const row = await prisma.profile.findUnique({ where: { id: 1 } });
      return json(
        row ?? { name: "", role: "", bio: "", email: "", github: "", location: "" },
      );
    },
  },
  {
    def: {
      name: "update_profile",
      description: "프로필을 업데이트합니다 (upsert).",
      inputSchema: profileInputJsonSchema as unknown as Record<string, unknown>,
    },
    handler: async (input) => {
      const parsed = profileInputSchema.safeParse(input);
      if (!parsed.success) {
        return errorResult("invalid input", { issues: parsed.error.flatten() });
      }
      const data = parsed.data;
      const saved = await prisma.profile.upsert({
        where: { id: 1 },
        update: data,
        create: { id: 1, ...data },
      });
      return json(saved);
    },
  },
  {
    def: {
      name: "upload_image",
      description:
        "base64 로 인코딩된 이미지를 Vercel Blob 에 업로드하고 공개 URL 을 반환합니다. 그 URL 을 create_project/update_project 의 image 필드에 그대로 쓰면 됩니다. 최대 4MB.",
      inputSchema: {
        type: "object",
        properties: {
          data: { type: "string", description: "base64(또는 data URL) 인코딩된 이미지 바이트" },
          mime: {
            type: "string",
            enum: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
          },
        },
        required: ["data", "mime"],
        additionalProperties: false,
      },
    },
    handler: async (input) => {
      const parsed = z
        .object({ data: z.string().min(1), mime: z.string().min(1) })
        .safeParse(input);
      if (!parsed.success) return errorResult("invalid input");
      const { data, mime } = parsed.data;
      if (!ALLOWED_MIME.has(mime)) {
        return errorResult("unsupported type", { mime });
      }
      // data URL 접두사 ("data:image/png;base64,") 는 제거 후 디코드.
      const raw = data.replace(/^data:[^;]+;base64,/, "");
      let buf: Buffer;
      try {
        buf = Buffer.from(raw, "base64");
      } catch {
        return errorResult("base64 decode failed");
      }
      if (buf.byteLength === 0) return errorResult("empty body");
      if (buf.byteLength > MAX_UPLOAD_BYTES) {
        return errorResult("file too large", { maxBytes: MAX_UPLOAD_BYTES });
      }
      const key = `projects/${randomUUID()}.${extByMime(mime)}`;
      const result = await put(key, buf, {
        access: "public",
        contentType: mime,
        addRandomSuffix: false,
      });
      return json({ url: result.url });
    },
  },
];

const TOOL_MAP = new Map<string, ToolEntry>(TOOLS.map((t) => [t.def.name, t]));

export function listToolDefinitions(): Tool[] {
  return TOOLS.map((t) => t.def);
}

export async function callTool(name: string, input: unknown): Promise<ToolResult> {
  const entry = TOOL_MAP.get(name);
  if (!entry) return errorResult(`unknown tool: ${name}`);
  try {
    return await entry.handler(input ?? {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResult(`tool execution failed: ${msg}`);
  }
}
