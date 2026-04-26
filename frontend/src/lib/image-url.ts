const DRIVE_FILE_RE = /drive\.google\.com\/file\/d\/([\w-]+)/;
const DRIVE_OPEN_RE = /drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/;

export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.match(DRIVE_FILE_RE) ?? url.match(DRIVE_OPEN_RE);
  if (match?.[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}
