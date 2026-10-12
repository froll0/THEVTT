/**
 * App updates from the GitHub releases of the project, installed in one click:
 * on Windows the new installer runs silently and restarts the app; a Linux
 * AppImage replaces itself; on macOS the app is copied out of the new .dmg.
 * Anything else (a .deb install…) opens the release page.
 */

import type { UpdateInfo } from '../preload/api';

export const RELEASES_API = 'https://api.github.com/repos/froll0/THEVTT/releases/latest';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GithubRelease {
  tag_name: string;
  name?: string | null;
  body?: string | null;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  assets: ReleaseAsset[];
}

/** 1.2.3 → [1,2,3]; tolerant of a leading v and of suffixes. */
function parts(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map((p) => Number.parseInt(p, 10) || 0);
}

export function isNewer(latest: string, current: string): boolean {
  const a = parts(latest);
  const b = parts(current);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** What to offer for this release on this machine, or null when up to date. */
export function pickUpdate(release: GithubRelease, current: string, platform: string, arch: string, isAppImage: boolean, macBundle: string | null = null): UpdateInfo | null {
  if (release.draft || release.prerelease || !isNewer(release.tag_name, current)) return null;
  const find = (re: RegExp) => release.assets.find((a) => re.test(a.name));
  let asset: ReleaseAsset | undefined;
  let mode: UpdateInfo['mode'] = 'page';
  if (platform === 'win32') {
    asset = find(/Setup.*\.exe$/i) ?? find(/\.exe$/i);
    if (asset) mode = 'installer';
  } else if (platform === 'linux' && isAppImage) {
    const archName = arch === 'arm64' ? 'arm64' : 'x86_64';
    asset = find(new RegExp(`${archName}\\.AppImage$`, 'i')) ?? find(/\.AppImage$/i);
    if (asset) mode = 'appimage';
  } else if (platform === 'darwin') {
    asset = find(new RegExp(`${arch === 'arm64' ? 'arm64' : 'x64'}\\.dmg$`, 'i')) ?? find(/\.dmg$/i);
    // replacing the bundle needs to know where it is (not when run from the mounted .dmg itself)
    if (asset && macBundle && !macBundle.startsWith('/Volumes/')) mode = 'dmg';
  }
  return {
    current,
    latest: release.tag_name.replace(/^v/i, ''),
    notes: (release.body ?? '').trim(),
    pageUrl: release.html_url,
    publishedAt: release.published_at ?? null,
    asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size } : null,
    mode,
  };
}

/** /Applications/TheVTT.app/Contents/MacOS/TheVTT → /Applications/TheVTT.app */
export function macBundlePath(execPath: string): string | null {
  const m = /^(.+?\.app)\/Contents\/MacOS\//.exec(execPath);
  return m ? m[1]! : null;
}

const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/**
 * Run detached once the app has quit: mounts the new .dmg, copies the app over
 * the current bundle, unmounts and starts the new version.
 */
export function macInstallScript(dmg: string, bundle: string, pid: number): string {
  return [
    `while kill -0 ${pid} 2>/dev/null; do sleep 0.5; done`,
    `MNT=$(mktemp -d /tmp/thevtt-update.XXXXXX)`,
    `hdiutil attach -nobrowse -noautoopen -mountpoint "$MNT" ${sh(dmg)} >/dev/null || exit 1`,
    `SRC=$(ls -d "$MNT"/*.app | head -n 1)`,
    `if [ -n "$SRC" ]; then rm -rf ${sh(bundle)}.old && mv ${sh(bundle)} ${sh(bundle)}.old && ditto "$SRC" ${sh(bundle)} && rm -rf ${sh(bundle)}.old || { rm -rf ${sh(bundle)}; mv ${sh(bundle)}.old ${sh(bundle)}; }; fi`,
    `hdiutil detach "$MNT" -quiet; rm -f ${sh(dmg)}`,
    `xattr -dr com.apple.quarantine ${sh(bundle)} 2>/dev/null`,
    `open ${sh(bundle)}`,
  ].join('\n');
}
