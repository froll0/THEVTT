export const DEFAULT_PORT = 4477;

/**
 * Accepts what people paste as an invite: "1.2.3.4", "1.2.3.4:4477",
 * "host.example.com", "https://vtt.example.com" … and returns a server URL.
 */
export function normalizeServerAddress(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  try {
    const url = new URL(s);
    if (!url.hostname) return null;
    if (!url.port && url.protocol === 'http:') url.port = String(DEFAULT_PORT);
    return url.origin;
  } catch {
    return null;
  }
}

/** Short form shown to users: "1.2.3.4:4477" or "vtt.example.com". */
export function displayServerAddress(url: string): string {
  return url.replace(/^http:\/\//, '').replace(/\/$/, '');
}
