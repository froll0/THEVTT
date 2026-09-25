/**
 * App updates from the GitHub releases of the project. On Windows the new
 * installer is downloaded and started; a Linux AppImage replaces itself; on
 * macOS (unsigned builds) the release page is opened instead.
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
export function pickUpdate(release: GithubRelease, current: string, platform: string, arch: string, isAppImage: boolean): UpdateInfo | null {
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
