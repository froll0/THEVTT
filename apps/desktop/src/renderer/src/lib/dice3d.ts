import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * 3D dice thrown on the table. The result is decided by the host before any
 * animation: we simulate the throw offline, see which face lands on top, then
 * number the faces so that face shows the real value, and replay the recording.
 */

export type DieKind = 4 | 6 | 8 | 10 | 12 | 20;

export interface DieSpec {
  sides: DieKind;
  /** the face that must end up on top */
  value: number;
  /** text for that face: d100 tens show "00".."90" */
  labels?: 'tens';
  dim?: boolean;
}

// ---------- geometry ----------

type V3 = [number, number, number];

interface Poly {
  vertices: V3[];
  /** faces as vertex indices, counter-clockwise seen from outside */
  faces: number[][];
}

const PHI = (1 + Math.sqrt(5)) / 2;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Faces of the convex hull of a small point set (brute force: fine for 20 points). */
function hull(vertices: V3[]): Poly {
  const faces: number[][] = [];
  const seen = new Set<string>();
  const n = vertices.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const nrm = cross(sub(vertices[j]!, vertices[i]!), sub(vertices[k]!, vertices[i]!));
        if (Math.hypot(...nrm) < 1e-9) continue;
        const nn = norm(nrm);
        const d = dot(nn, vertices[i]!);
        let pos = 0;
        let neg = 0;
        const on: number[] = [];
        for (let m = 0; m < n; m++) {
          const s = dot(nn, vertices[m]!) - d;
          if (Math.abs(s) < 1e-6) on.push(m);
          else if (s > 0) pos++;
          else neg++;
        }
        if (pos && neg) continue;
        const key = on.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        // outward normal, then order the face's points around its centre
        const out: V3 = pos ? [-nn[0], -nn[1], -nn[2]] : nn;
        const c = on.reduce<V3>((acc, m) => [acc[0] + vertices[m]![0] / on.length, acc[1] + vertices[m]![1] / on.length, acc[2] + vertices[m]![2] / on.length], [0, 0, 0]);
        const u = norm(sub(vertices[on[0]!]!, c));
        const v = cross(out, u);
        on.sort((a, b) => {
          const pa = sub(vertices[a]!, c);
          const pb = sub(vertices[b]!, c);
          return Math.atan2(dot(pa, v), dot(pa, u)) - Math.atan2(dot(pb, v), dot(pb, u));
        });
        faces.push(on);
      }
  return { vertices, faces };
}

function scaled(p: Poly, radius: number): Poly {
  const r = Math.max(...p.vertices.map((v) => Math.hypot(...v)));
  return { faces: p.faces, vertices: p.vertices.map((v) => [(v[0] * radius) / r, (v[1] * radius) / r, (v[2] * radius) / r]) };
}

function d10Points(): V3[] {
  const a = 0.105;
  const c36 = Math.cos(Math.PI / 5);
  const h = (a * (1 + c36)) / (1 - c36);
  const pts: V3[] = [
    [0, h, 0],
    [0, -h, 0],
  ];
  for (let i = 0; i < 10; i++) {
    const ang = (i * Math.PI) / 5;
    pts.push([Math.cos(ang), i % 2 ? -a : a, Math.sin(ang)]);
  }
  return pts;
}

const SHAPES: Record<DieKind, () => Poly> = {
  4: () => scaled(hull([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]), 0.9),
  6: () => scaled(hull([-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as V3)))), 0.78),
  8: () => scaled(hull([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]), 0.8),
  10: () => scaled(hull(d10Points()), 0.78),
  12: () => {
    const p: V3[] = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) p.push([x, y, z]);
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        p.push([0, a / PHI, b * PHI]);
        p.push([a / PHI, b * PHI, 0]);
        p.push([a * PHI, 0, b / PHI]);
      }
    return scaled(hull(p), 0.85);
  },
  20: () => {
    const p: V3[] = [];
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        p.push([0, a, b * PHI]);
        p.push([a, b * PHI, 0]);
        p.push([a * PHI, 0, b]);
      }
    return scaled(hull(p), 0.85);
  },
};

const shapeCache = new Map<DieKind, Poly>();
export const shape = (k: DieKind) => {
  let s = shapeCache.get(k);
  if (!s) shapeCache.set(k, (s = SHAPES[k]()));
  return s;
};

// ---------- which face is up ----------

/** Index of the face (or, for a d4, the vertex) pointing up for a body orientation. */
export function upIndex(kind: DieKind, q: { x: number; y: number; z: number; w: number }): number {
  const p = shape(kind);
  const rot = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  const up = new THREE.Vector3(0, 1, 0);
  let best = -Infinity;
  let idx = 0;
  if (kind === 4) {
    p.vertices.forEach((v, i) => {
      const y = new THREE.Vector3(...v).applyQuaternion(rot).dot(up);
      if (y > best) [best, idx] = [y, i];
    });
    return idx;
  }
  p.faces.forEach((f, i) => {
    const a = p.vertices[f[0]!]!;
    const n = norm(cross(sub(p.vertices[f[1]!]!, a), sub(p.vertices[f[2]!]!, a)));
    const y = new THREE.Vector3(...n).applyQuaternion(rot).dot(up);
    if (y > best) [best, idx] = [y, i];
  });
  return idx;
}

/** Face (or d4 vertex) labels 1..n, then swapped so `up` shows `value`. */
export function labelsFor(kind: DieKind, up: number, value: number): number[] {
  const n = kind === 4 ? 4 : shape(kind).faces.length;
  const base = kind === 10 ? Array.from({ length: n }, (_, i) => i) : Array.from({ length: n }, (_, i) => i + 1);
  const want = kind === 10 ? value % 10 : value;
  const at = base.indexOf(want);
  if (at >= 0 && at !== up) [base[at], base[up]] = [base[up]!, base[at]!];
  return base;
}

// ---------- textures ----------

const CELL_PX = 128;

function faceText(kind: DieKind, label: number, tens?: boolean): string {
  if (kind === 10 && tens) return label === 0 ? '00' : `${label}0`;
  return String(label);
}

function buildMesh(kind: DieKind, labels: number[], color: string, ink: string, tens: boolean, dim: boolean): THREE.Mesh {
  const p = shape(kind);
  const cols = Math.ceil(Math.sqrt(p.faces.length));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cols * CELL_PX;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  p.faces.forEach((f, fi) => {
    const cx = (fi % cols) * CELL_PX;
    const cy = Math.floor(fi / cols) * CELL_PX;
    const pts = f.map((i) => p.vertices[i]!);
    const c = pts.reduce<V3>((a, v) => [a[0] + v[0] / pts.length, a[1] + v[1] / pts.length, a[2] + v[2] / pts.length], [0, 0, 0]);
    const n = norm(cross(sub(pts[1]!, pts[0]!), sub(pts[2]!, pts[0]!)));
    // 2D basis on the face; kites (d10) point their long axis up
    const far = kind === 10 ? pts.reduce((a, v) => (Math.hypot(...sub(v, c)) > Math.hypot(...sub(a, c)) ? v : a)) : pts[0]!;
    const u = norm(sub(far, c));
    // (v, u, n) right-handed, so text isn't mirrored seen from outside
    const v = cross(u, n);
    const flat = pts.map((q) => [dot(sub(q, c), v), dot(sub(q, c), u)] as [number, number]);
    const ext = Math.max(...flat.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
    const toPx = ([x, y]: [number, number]): [number, number] => [cx + CELL_PX / 2 + (x / ext) * CELL_PX * 0.46, cy + CELL_PX / 2 - (y / ext) * CELL_PX * 0.46];
    const toUv = ([x, y]: [number, number]): [number, number] => {
      const [px, py] = toPx([x, y]);
      return [px / canvas.width, 1 - py / canvas.height];
    };

    if (kind === 4) {
      // numbers sit near each corner, pointing at it: the top corner is the result
      f.forEach((vi, k) => {
        const [x, y] = flat[k]!;
        const [px, py] = toPx([x * 0.55, y * 0.55]);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.atan2(x, y));
        ctx.font = `700 ${CELL_PX * 0.22}px system-ui, sans-serif`;
        ctx.fillText(String(labels[vi]), 0, 0);
        ctx.restore();
      });
    } else {
      const text = faceText(kind, labels[fi]!, tens);
      const [px, py] = toPx([0, kind === 10 ? ext * 0.12 : 0]);
      const size = { 6: 0.5, 8: 0.36, 10: 0.3, 12: 0.34, 20: 0.28 }[kind] * CELL_PX;
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.fillText(text, px, py);
      if (text === '6' || text === '9') ctx.fillRect(px - size * 0.22, py + size * 0.42, size * 0.44, size * 0.07);
    }

    for (let k = 1; k + 1 < pts.length; k++) {
      for (const idx of [0, k, k + 1]) {
        positions.push(...pts[idx]!);
        normals.push(...n);
        uvs.push(...toUv(flat[idx]!));
      }
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.05, transparent: true, opacity: dim ? 0.45 : 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// ---------- physics ----------

interface Frame {
  p: [number, number, number];
  q: [number, number, number, number];
}

const STEP = 1 / 60;
const MAX_STEPS = 60 * 6;

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export function simulate(kinds: DieKind[], r: Rect): Frame[][] {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -30, 0), allowSleep: true });
  const diceMat = new CANNON.Material('die');
  const floorMat = new CANNON.Material('floor');
  world.addContactMaterial(new CANNON.ContactMaterial(diceMat, floorMat, { friction: 0.35, restitution: 0.35 }));
  world.addContactMaterial(new CANNON.ContactMaterial(diceMat, diceMat, { friction: 0.2, restitution: 0.4 }));

  const floor = new CANNON.Body({ mass: 0, material: floorMat, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  const wall = (x: number, z: number, rotY: number) => {
    const b = new CANNON.Body({ mass: 0, material: floorMat, shape: new CANNON.Plane() });
    b.position.set(x, 0, z);
    b.quaternion.setFromEuler(0, rotY, 0);
    world.addBody(b);
  };
  const m = 0.7;
  wall(r.x0 + m, 0, Math.PI / 2);
  wall(r.x1 - m, 0, -Math.PI / 2);
  wall(0, r.z0 + m, 0);
  wall(0, r.z1 - m, Math.PI);

  const bodies = kinds.map((k, i) => {
    const p = shape(k);
    const body = new CANNON.Body({
      mass: 1,
      material: diceMat,
      shape: new CANNON.ConvexPolyhedron({ vertices: p.vertices.map((v) => new CANNON.Vec3(...v)), faces: p.faces }),
      sleepSpeedLimit: 0.15,
      sleepTimeLimit: 0.25,
      angularDamping: 0.12,
      linearDamping: 0.08,
    });
    // thrown in from the lower right corner towards the middle, a little spread out
    body.position.set(r.x1 - 1.6 - (i % 4) * 0.9, 2 + Math.random() * 1.5 + Math.floor(i / 4) * 0.8, r.z1 - 1.6 - Math.floor(i / 4) * 0.9);
    body.quaternion.setFromEuler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    const speed = 11 + Math.random() * 6;
    const ang = Math.PI * 1.25 + (Math.random() - 0.5) * 0.5;
    body.velocity.set(Math.cos(ang) * speed, -2, Math.sin(ang) * speed * 0.8);
    body.angularVelocity.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    world.addBody(body);
    return body;
  });

  const frames: Frame[][] = bodies.map(() => []);
  for (let s = 0; s < MAX_STEPS; s++) {
    world.step(STEP);
    bodies.forEach((b, i) => frames[i]!.push({ p: [b.position.x, b.position.y, b.position.z], q: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w] }));
    if (s > 30 && bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING)) break;
  }
  return frames;
}

/** Probe once with a throwaway canvas: three.js logs errors when WebGL is missing. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

// ---------- the tray ----------

interface Throw {
  meshes: THREE.Mesh[];
  frames: Frame[][];
  start: number;
  length: number;
  onSettle?: () => void;
  settled: boolean;
}

const HOLD_MS = 1600;
const FADE_MS = 450;

/** A transparent WebGL layer over the board where dice roll. */
export class DiceTray {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private throws: Throw[] = [];
  private raf = 0;
  private bounds: Rect = { x0: -8, x1: 8, z0: -5, z1: 5 };

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const el = this.renderer.domElement;
    el.className = 'dice-layer';
    host.appendChild(el);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x303038, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(-4, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.35 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.camera.position.set(0, 22, 7);
    this.camera.lookAt(0, 0, 0.6);
    this.resize();
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.host;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // lookAt() alone doesn't refresh the world matrix the raycaster reads
    this.camera.updateMatrixWorld();
    // visible floor, to keep the dice on screen
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = (x: number, y: number) => {
      ray.setFromCamera(new THREE.Vector2(x, y), this.camera);
      return ray.ray.intersectPlane(plane, new THREE.Vector3()) ?? new THREE.Vector3();
    };
    // the view is a trapezoid, narrower at the bottom of the screen: stay inside that
    const bl = hit(-1, -1);
    const br = hit(1, -1);
    const top = hit(0, 1);
    this.bounds = { x0: Math.max(bl.x, -30), x1: Math.min(br.x, 30), z0: Math.max(top.z, -30), z1: Math.min(br.z, 30) };
  }

  /** Throws the given dice; `onSettle` fires when they stop. */
  roll(dice: DieSpec[], color: string, ink: string, onSettle?: () => void) {
    if (!dice.length) return;
    this.resize();
    const kinds = dice.map((d) => d.sides);
    const frames = simulate(kinds, this.bounds);
    const meshes = dice.map((d, i) => {
      const last = frames[i]!.at(-1)!;
      const up = upIndex(d.sides, { x: last.q[0], y: last.q[1], z: last.q[2], w: last.q[3] });
      const value = d.labels === 'tens' ? Math.floor((d.value % 100) / 10) : d.value;
      const mesh = buildMesh(d.sides, labelsFor(d.sides, up, value), color, ink, d.labels === 'tens', !!d.dim);
      this.scene.add(mesh);
      return mesh;
    });
    this.throws.push({ meshes, frames, start: performance.now(), length: Math.max(...frames.map((f) => f.length)), onSettle, settled: false });
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    for (const t of this.throws) {
      // the frame timestamp can precede the throw by a few ms
      const step = Math.max(0, Math.floor(((now - t.start) / 1000) * 60));
      t.meshes.forEach((m, i) => {
        const f = t.frames[i]![Math.min(step, t.frames[i]!.length - 1)]!;
        m.position.set(...f.p);
        m.quaternion.set(...f.q);
      });
      const doneAt = t.start + (t.length / 60) * 1000;
      if (!t.settled && now >= doneAt) {
        t.settled = true;
        t.onSettle?.();
      }
      const fade = (now - doneAt - HOLD_MS) / FADE_MS;
      if (fade > 0) {
        for (const m of t.meshes) {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.opacity = Math.max(0, (mat.userData.base ??= mat.opacity) * (1 - fade));
        }
      }
    }
    const done = this.throws.filter((t) => now > t.start + (t.length / 60) * 1000 + HOLD_MS + FADE_MS);
    for (const t of done) {
      for (const m of t.meshes) {
        this.scene.remove(m);
        m.geometry.dispose();
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    }
    this.throws = this.throws.filter((t) => !done.includes(t));
    this.renderer.render(this.scene, this.camera);
    if (this.throws.length) this.raf = requestAnimationFrame(this.frame);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    for (const t of this.throws) for (const m of t.meshes) m.geometry.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** Dice to show for a roll: standard dice only, at most `max`. d100 = tens + units d10. */
export function diceFor(parts: { type: string; sides?: number; rolls?: { value: number; dropped: boolean }[] }[], max = 16): DieSpec[] {
  const out: DieSpec[] = [];
  for (const p of parts) {
    if (p.type !== 'dice' || !p.rolls) continue;
    for (const r of p.rolls) {
      if (out.length >= max) return out;
      if (p.sides === 100) {
        out.push({ sides: 10, value: r.value, labels: 'tens', dim: r.dropped });
        out.push({ sides: 10, value: r.value % 10, dim: r.dropped });
      } else if (p.sides === 4 || p.sides === 6 || p.sides === 8 || p.sides === 10 || p.sides === 12 || p.sides === 20) {
        out.push({ sides: p.sides, value: r.value, dim: r.dropped });
      }
    }
  }
  return out;
}
