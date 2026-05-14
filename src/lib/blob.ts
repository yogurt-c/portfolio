import { del } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB
export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export function extByMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}

// 같은 Vercel Blob 스토어에서 발급된 URL 만 정리 대상으로 본다.
// 외부 이미지 URL(예: 기존 외부 CDN)은 건드리지 않는다.
function isOwnedBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const IMG_SRC_RE = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

export function extractImageUrls(html: string): string[] {
  if (!html) return [];
  const out: string[] = [];
  for (const m of html.matchAll(IMG_SRC_RE)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

export function collectBlobUrls(
  thumbnail: string,
  bodyHtml: string,
): string[] {
  const all = [thumbnail, ...extractImageUrls(bodyHtml)];
  const owned = all.filter((u) => u && isOwnedBlobUrl(u));
  return Array.from(new Set(owned));
}

// 더 이상 참조되지 않는 blob 만 삭제. 실패는 무시(스토리지 정리는 best-effort).
export async function deleteOrphans(
  oldUrls: string[],
  newUrls: string[],
): Promise<void> {
  const keep = new Set(newUrls);
  const orphans = oldUrls.filter((u) => !keep.has(u));
  if (orphans.length === 0) return;
  await Promise.allSettled(orphans.map((u) => del(u)));
}
