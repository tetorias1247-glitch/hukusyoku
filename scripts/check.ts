import { GARMENTS } from "../lib/garments";
import { FABRICS, SIZES, deriveMeasures } from "../lib/data";
import { estimate } from "../lib/estimate";
import { area, mirrorFull } from "../lib/geometry";
import type { Pt, Piece } from "../lib/types";

function segInt(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return d1 * d2 < -1e-9 && d3 * d4 < -1e-9;
}
function selfIntersect(poly: Pt[]) {
  const n = poly.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segInt(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return true;
  }
  return false;
}
const issues = new Map<string, string[]>();
const add = (k: string, m: string) => { const a = issues.get(k) ?? []; if (!a.includes(m)) a.push(m); issues.set(k, a); };
let runs = 0;
for (const g of GARMENTS) for (const s of SIZES) for (const f of FABRICS) {
  const m = deriveMeasures({ bust: s.bust, waist: s.waist, hip: s.hip, height: s.height }, s.group === "men");
  const p: Record<string, number | string> = {};
  for (const d of g.params) p[d.key] = d.def(m);
  const width = f.width;
  const ctx = { fabric: f, sa: 1, hem: 2.5, width };
  const key = `${g.id}`;
  try {
    const b = g.build(m, p, ctx);
    runs++;
    const e = estimate(b, ctx, { width, pattern: "none", garmentKind: g.suitable });
    if (!Number.isFinite(e.main.need)) add(key, "need NaN");
    for (const pc of b.pieces as Piece[]) {
      const bad = pc.poly.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y));
      if (bad) add(key, `${pc.id}: NaN pts (${s.id})`);
      const full = pc.onFold ? mirrorFull(pc.poly) : pc.poly;
      if (area(full) < 1) add(key, `${pc.id}: tiny area (${s.id})`);
      if (selfIntersect(full)) add(key, `${pc.id}: self-intersect (${s.id}/${f.id})`);
      if (pc.onFold && (Math.abs(pc.poly[0][0]) > 1e-6 || Math.abs(pc.poly[pc.poly.length - 1][0]) > 1e-6)) add(key, `${pc.id}: fold ends not on x=0`);
      if (pc.poly.some(([x]) => x < -1e-6) && pc.onFold) add(key, `${pc.id}: negative x on fold`);
    }
    if (e.main.efficiency < 0.35 && f.id === g.preferFabric) add(key, `low efficiency ${e.main.efficiency.toFixed(2)} (${s.id})`);
  } catch (err) {
    add(key, `EXC ${(err as Error).message} (${s.id}/${f.id})`);
  }
}
console.log("runs", runs);
for (const [k, v] of issues) console.log(k, "\n  " + v.slice(0, 6).join("\n  "), v.length > 6 ? `\n  ...+${v.length - 6}` : "");
