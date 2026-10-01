import { GARMENTS } from "../lib/garments";
import { FABRICS, SIZES, deriveMeasures } from "../lib/data";
import { ADJUST_DEFS, adjustKeysFor } from "../lib/adjust";
import { area, bbox, mirrorFull } from "../lib/geometry";
import { NO_ADJUST, type Adjust, type Pt } from "../lib/types";

const segInt = (a: Pt, b: Pt, c: Pt, d: Pt) => { const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); return o(c, d, a) * o(c, d, b) < -1e-9 && o(a, b, c) * o(a, b, d) < -1e-9; };
const selfI = (poly: Pt[]) => { const n = poly.length; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (segInt(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return true; } return false; };
const ctx = { fabric: FABRICS[0], sa: 1, hem: 2.5, width: 110 };
const issues: string[] = [];
let runs = 0;
for (const g of GARMENTS) for (const s of [SIZES[0], SIZES[2], SIZES[5], SIZES.find((x) => x.id === "mL")!, SIZES.find((x) => x.id === "k110")!]) {
  const m0 = deriveMeasures({ bust: s.bust, waist: s.waist, hip: s.hip, height: s.height }, s.group === "men");
  const p: Record<string, number | string> = {};
  for (const d of g.params) p[d.key] = d.def(m0);
  const keys = adjustKeysFor(g, p);
  const cases: Adjust[] = [];
  for (const k of keys) { const d = ADJUST_DEFS.find((x) => x.key === k)!; cases.push({ ...NO_ADJUST, [k]: d.min }, { ...NO_ADJUST, [k]: d.max }); }
  const allMax = { ...NO_ADJUST }, allMin = { ...NO_ADJUST };
  for (const k of keys) { const d = ADJUST_DEFS.find((x) => x.key === k)!; allMax[k] = d.max; allMin[k] = d.min; }
  cases.push(allMax, allMin);
  for (const a of cases) {
    runs++;
    try {
      const b = g.build({ ...m0, adj: a }, p, ctx);
      for (const pc of b.pieces) {
        const full = pc.onFold ? mirrorFull(pc.poly) : pc.poly;
        if (pc.poly.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) issues.push(`${g.id} ${pc.id} NaN`);
        else if (area(full) < 1) issues.push(`${g.id} ${pc.id} tiny`);
        else if (selfI(full)) issues.push(`${g.id} ${pc.id} self-intersect ${JSON.stringify(Object.fromEntries(Object.entries(a).filter(([, v]) => v)))} ${s.id}`);
      }
    } catch (e) { issues.push(`${g.id} EXC ${(e as Error).message}`); }
  }
}
console.log("adjust runs", runs, "issues", issues.length);
console.log([...new Set(issues)].slice(0, 15).join("\n"));

// 効果の確認
const m = deriveMeasures({ bust: 83, waist: 64, hip: 91, height: 158 }, false);
const ctx2 = ctx;
const get = (id: string, adj: Partial<Adjust>) => { const g = GARMENTS.find((x) => x.id === id)!; const p: Record<string, number | string> = {}; for (const d of g.params) p[d.key] = d.def(m); return g.build({ ...m, adj: { ...NO_ADJUST, ...adj } }, p, ctx2).pieces; };
const w = (pcs: ReturnType<typeof get>, id: string) => bbox(pcs.find((x) => x.id === id)!.poly);
const base = get("tshirt", {});
console.log("tee front h  base", w(base, "front").h.toFixed(1), "frontLen+3", w(get("tshirt", { frontLen: 3 }), "front").h.toFixed(1));
console.log("tee back  h  base", w(base, "back").h.toFixed(1), "backLen+3", w(get("tshirt", { backLen: 3 }), "back").h.toFixed(1));
console.log("tee front w  base", w(base, "front").w.toFixed(1), "balance+2", w(get("tshirt", { bustBalance: 2 }), "front").w.toFixed(1), "back w", w(get("tshirt", { bustBalance: 2 }), "back").w.toFixed(1), "(base back", w(base, "back").w.toFixed(1) + ")");
console.log("tee sleeve w base", w(base, "sleeve").w.toFixed(1), "arm+6", w(get("tshirt", { arm: 6 }), "sleeve").w.toFixed(1), "h", w(base, "sleeve").h.toFixed(1), "->", w(get("tshirt", { arm: 6 }), "sleeve").h.toFixed(1));
const sl = (a: number) => get("tshirt", { slope: a }).find((x) => x.id === "front")!.poly;
console.log("tee shoulder tip y (min x-ish) slope 0:", Math.max(...sl(0).slice(0, 20).map((p) => p[1])).toFixed(1));
console.log("pants front h base", w(get("pants", {}), "front").h.toFixed(1), "tummy+3", w(get("pants", { tummy: 3 }), "front").h.toFixed(1), " back h base", w(get("pants", {}), "back").h.toFixed(1), "seat+3", w(get("pants", { seat: 3 }), "back").h.toFixed(1));
console.log("pants thigh w base", w(get("pants", {}), "front").w.toFixed(1), "thigh+8", w(get("pants", { thigh: 8 }), "front").w.toFixed(1));
console.log("aline back h base", w(get("aline", {}), "back").h.toFixed(1), "seat+3", w(get("aline", { seat: 3 }), "back").h.toFixed(1));
