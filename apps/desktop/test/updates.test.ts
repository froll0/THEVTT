import { describe, expect, it } from 'vitest';
import { isNewer, pickUpdate, type GithubRelease } from '../src/main/updates';

const release: GithubRelease = {
  tag_name: 'v0.5.0',
  body: 'Novità',
  html_url: 'https://github.com/froll0/THEVTT/releases/tag/v0.5.0',
  assets: [
    { name: 'TheVTT-Setup-0.5.0.exe', browser_download_url: 'https://x/setup.exe', size: 10 },
    { name: 'TheVTT-0.5.0-linux-x86_64.AppImage', browser_download_url: 'https://x/a.AppImage', size: 10 },
    { name: 'TheVTT-0.5.0-mac-arm64.dmg', browser_download_url: 'https://x/arm.dmg', size: 10 },
    { name: 'TheVTT-0.5.0-mac-x64.dmg', browser_download_url: 'https://x/x64.dmg', size: 10 },
  ],
};

describe('app updates', () => {
  it('compares versions', () => {
    expect(isNewer('v0.5.0', '0.4.0')).toBe(true);
    expect(isNewer('0.10.0', '0.9.9')).toBe(true);
    expect(isNewer('v0.4.0', '0.4.0')).toBe(false);
    expect(isNewer('0.3.9', '0.4.0')).toBe(false);
  });

  it('picks the right file for each platform', () => {
    expect(pickUpdate(release, '0.5.0', 'win32', 'x64', false)).toBeNull();
    expect(pickUpdate(release, '0.4.0', 'win32', 'x64', false)).toMatchObject({ latest: '0.5.0', mode: 'installer', asset: { url: 'https://x/setup.exe' } });
    expect(pickUpdate(release, '0.4.0', 'linux', 'x64', true)).toMatchObject({ mode: 'appimage', asset: { url: 'https://x/a.AppImage' } });
    // a .deb install can't replace itself: show the page
    expect(pickUpdate(release, '0.4.0', 'linux', 'x64', false)).toMatchObject({ mode: 'page', asset: null });
    expect(pickUpdate(release, '0.4.0', 'darwin', 'arm64', false)).toMatchObject({ mode: 'page', asset: { url: 'https://x/arm.dmg' } });
    expect(pickUpdate({ ...release, prerelease: true }, '0.4.0', 'win32', 'x64', false)).toBeNull();
  });
});
