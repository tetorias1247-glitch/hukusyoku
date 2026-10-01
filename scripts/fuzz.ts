import { GARMENTS } from "../lib/garments";
import { FABRICS, SIZES, deriveMeasures } from "../lib/data";
import { estimate } from "../lib/estimate";
import { area, mirrorFull } from "../lib/geometry";
import type { Pt } from "../lib/types";

function segInt(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(c, d, a) * o(c, d, b) < -1e-9 && o(a, b, c) * o(a, b, d) < -1e-9;
}
const selfI = (poly: Pt[]) => { const n = poly.length; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (segInt(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return true; } return false; };
const issues = new Map<string, Set<string>>();
const add = (k: string, m: string) => { if (!issues.has(k)) issues.set(k, new Set()); issues.get(k)!.add(m); };
const sizes = [SIZES[0], SIZES[2], SIZES[5], SIZES[9], ...SIZES.filter((s) => s.group === "kids")];
const f = FABRICS[0];
for (const g of GARMENTS) for (const s of sizes) {
  const m = deriveMeasures({ bust: s.bust, waist: s.waist, hip: s.hip, height: s.height }, s.group === "men");
  const base: Record<string, number | string> = {};
  for (const d of g.params) base[d.key] = d.def(m);
  const cases: [string, Record<string, number | string>][] = [];
  for (const d of g.params) {
    if (d.kind === "number") { cases.push([`${d.key}=min`, { ...base, [d.key]: d.min! }]); cases.push([`${d.key}=max`, { ...base, [d.key]: d.max! }]); }
    else for (const o of d.options!) cases.push([`${d.key}=${o.value}`, { ...base, [d.key]: o.value }]);
  }
  for (const [label, p] of cases) {
    const ctx = { fabric: f, sa: 1, hem: 2.5, width: 110 };
    try {
      const b = g.build(m, p, ctx);
      estimate(b, ctx, { width: 110, pattern: "none", garmentKind: g.suitable });
      for (const pc of b.pieces) {
        const full = pc.onFold ? mirrorFull(pc.poly) : pc.poly;
        if (pc.poly.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) add(g.id, `${label} ${pc.id}: NaN`);
        else if (area(full) < 1) add(g.id, `${label} ${pc.id}: tiny`);
        else if (selfI(full)) add(g.id, `${label} ${pc.id}: self-intersect (${s.id})`);
      }
    } catch (e) { add(g.id, `${label}: EXC ${(e as Error).message}`); }
  }
}
for (const [k, v] of issues) console.log(k + "\n  " + [...v].slice(0, 10).join("\n  ") + (v.size > 10 ? `\n  ...+${v.size - 10}` : ""));
console.log("done, garments with issues:", issues.size);
