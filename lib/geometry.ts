import type { Pt } from "./types";

export const rad = (deg: number) => (deg * Math.PI) / 180;

/** 2次ベジェ(始点含む・終点含む) */
export function quad(a: Pt, c: Pt, b: Pt, n = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    ]);
  }
  return out;
}

/** 3次ベジェ */
export function cubic(a: Pt, c1: Pt, c2: Pt, b: Pt, n = 18): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
      u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
    ]);
  }
  return out;
}

/** Catmull-Rom スプラインで点列をなめらかに補間 */
export function smooth(pts: Pt[], per = 8): Pt[] {
  if (pts.length < 3) return pts.slice();
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** 円弧(中心c, 半径r, 角度a0→a1[度], 0度=右, 90度=下) */
export function arc(c: Pt, r: number, a0: number, a1: number, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n);
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}

export function pathLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

export function perimeter(poly: Pt[]): number {
  return pathLength(poly) + Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]);
}

export function area(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function bbox(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** 重複点を除去 */
export function dedupe(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) out.push(p);
  }
  if (out.length > 1) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) out.pop();
  }
  return out;
}

/** 多角形を左上(0,0)基準へ平行移動。marksも同じ量だけ動かす */
export function normalize(poly: Pt[], marks?: Pt[][]) {
  const clean = dedupe(poly);
  const b = bbox(clean);
  const sh = (p: Pt): Pt => [p[0] - b.minX, p[1] - b.minY];
  return { poly: clean.map(sh), marks: marks?.map((l) => l.map(sh)), dx: -b.minX, dy: -b.minY };
}

/** 多角形を d(cm) だけ外側へオフセット(縫い代) */
export function offsetPolygon(poly: Pt[], d: number): Pt[] {
  const n = poly.length;
  if (n < 3) return poly;
  const sgn = signedArea(poly) > 0 ? 1 : -1;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n];
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const n1 = edgeNormal(p0, p1, sgn);
    const n2 = edgeNormal(p1, p2, sgn);
    let nx = n1[0] + n2[0];
    let ny = n1[1] + n2[1];
    const l = Math.hypot(nx, ny);
    if (l < 1e-9) {
      out.push([p1[0] + n1[0] * d, p1[1] + n1[1] * d]);
      continue;
    }
    nx /= l;
    ny /= l;
    const cos = Math.max(0.35, nx * n1[0] + ny * n1[1]); // 鋭角の暴れを抑える
    out.push([p1[0] + (nx * d) / cos, p1[1] + (ny * d) / cos]);
  }
  return out;
}

function signedArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function edgeNormal(a: Pt, b: Pt, sgn: number): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  // 画面座標(y下向き)で、符号付き面積>0 は時計回り → 外向き法線は (dy,-dx)
  return [(sgn * dy) / l, (-sgn * dx) / l];
}

/** 「わ」(x=0)で折る半身を、左右対称の全体形へ展開 */
export function mirrorFull(poly: Pt[]): Pt[] {
  // 規約: 先頭と末尾の点は「わ」(x=0) 上にあり、わ線自体は辺として含めない
  const left = poly
    .slice()
    .reverse()
    .map(([x, y]): Pt => [-x, y]);
  return dedupe([...poly, ...left.slice(1, -1)]);
}

export const round1 = (v: number) => Math.round(v * 10) / 10;
