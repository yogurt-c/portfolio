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
    period: {
      type: "string",
      maxLength: 60,
      description: "프로젝트 기간. 예: '2024.01 ~ 2025.03'. 자유 문자열.",
      default: "",
    },
    desc: {
      type: "string",
      maxLength: 400,
      description: "카드/리스트에 노출되는 한 줄 요약.",
      default: "",
    },
    body: {
      type: "string",
      maxLength: 50000,
      description:
        "프로젝트 모달에 표시되는 본문 HTML (Tiptap 호환). 허용 태그: <p> <br> <strong> <em> <s> <u> <h2> <h3> <ul> <ol> <li> <blockquote> <code> <pre> <a href> <img>. 그 외는 sanitize 시 제거됨. 본문에 이미지를 넣으려면 먼저 upload_image 로 URL 을 받은 뒤 <img src=\"...\" alt=\"...\"> 형태로 본문 HTML 안에 직접 삽입한다. <img> 는 추가로 style=\"width: NN%\" (예: 80%) 와 data-align=\"left|center|right\" 만 허용.",
      default: "",
    },
    image: {
      type: "string",
      description:
        "카드 썸네일로 쓰이는 절대 URL. 비워둬도 됨. 사용 흐름: upload_image 를 먼저 호출해서 받은 url 을 여기에 그대로 넣는다. 외부 URL 도 동작은 하지만 자체 호스팅이 안전.",
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
  required: ["title"],
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
        "새 프로젝트를 생성한다. 목록 최상단(position 0)에 배치되고 기존 항목은 한 칸씩 밀린다.\n\n전체 흐름:\n1) 첨부 이미지가 있으면 먼저 upload_image 를 각각 호출해 공개 URL 을 받는다.\n2) 그 URL 중 하나를 썸네일로 image 필드에 넣는다 (생략 가능).\n3) 본문에 이미지를 넣을 거면 body HTML 안에 <img src=\"<업로드한 URL>\" alt=\"...\"> 를 직접 삽입한다.\n4) title (필수) · period (예: \"2024.06 ~ 2025.05\") · desc · tags · links 를 채워 호출.\n\nbody 는 sanitize 되므로 허용 외 태그는 조용히 제거된다. period 는 자유 문자열이라 \"2024.06 ~\" 같은 진행중 표기도 가능.",
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
            period: data.period,
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
        "id 로 프로젝트를 수정한다. 입력 스키마는 create_project 와 동일 (이미지 첨부 시 upload_image → body/image 에 URL 사용하는 흐름도 동일).\n\n전체 필드를 덮어쓰는 방식이라 부분 업데이트 시에도 기존 값을 함께 넘겨야 한다. 먼저 get_project 로 현재 값을 읽고 바꿀 필드만 교체해서 호출하는 것을 권장.\n\nbody/image 가 바뀌어 더 이상 어디서도 참조되지 않는 Vercel Blob 은 best-effort 로 자동 삭제된다.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          ...projectInputJsonSchema.properties,
        },
        required: ["id", "title"],
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
          period: data.period,
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
        "base64 로 인코딩된 이미지를 Vercel Blob 에 업로드하고 공개 URL 을 반환한다. create_project / update_project 호출 전에 먼저 사용한다.\n\n반환된 url 의 용도:\n- 썸네일: image 필드에 그대로 넣는다.\n- 본문 이미지: body HTML 안에 <img src=\"<url>\" alt=\"...\"> 형태로 삽입한다. 본문에 여러 장 넣을 거면 이미지마다 이 도구를 호출해 각각의 url 을 받아 본문 HTML 의 해당 위치에 끼워넣는다.\n\n제약: 최대 4MB, MIME 은 image/jpeg|png|webp|gif|avif 만 허용. data URL 접두사(\"data:image/...;base64,\")는 자동 제거되므로 그대로 넘겨도 됨.",
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
