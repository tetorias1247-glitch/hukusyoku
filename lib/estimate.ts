import type { BuildContext, BuildResult, FabricPreset, MaterialItem, Piece } from "./types";
import { area, bbox, mirrorFull, perimeter } from "./geometry";

export interface Rect {
  pieceId: string;
  label: string;
  w: number;
  h: number;
  /** 布幅に収まらず分割(はぎ合わせ)した */
  split?: boolean;
  mirrored?: boolean;
}

export interface Placement extends Rect {
  x: number;
  y: number;
}

export interface PackResult {
  placements: Placement[];
  length: number;
  width: number;
  oversize: boolean;
}

/** 棚詰め(シェルフ法)による簡易マーカー配置。布目(縦)方向は固定。 */
export function pack(rects: Rect[], width: number): PackResult {
  const usable = width - 2; // 耳 左右各1cmは使わない
  let oversize = false;
  const items: Rect[] = [];
  for (const r of rects) {
    if (r.w <= usable) {
      items.push(r);
    } else {
      oversize = true;
      const k = Math.ceil(r.w / (usable - 2));
      for (let i = 0; i < k; i++) items.push({ ...r, w: Math.min(usable, r.w / k + 2), split: true, label: `${r.label}(はぎ${i + 1}/${k})` });
    }
  }
  items.sort((a, b) => b.h - a.h || b.w - a.w);
  // 棚(横一列)の中に「縦に積める枠(スロット)」を持たせ、細長い帯は下に別の小パーツを積めるようにする
  interface Slot { x: number; w: number; top: number }
  interface Shelf { y: number; h: number; used: number; slots: Slot[] }
  const shelves: Shelf[] = [];
  const placements: Placement[] = [];
  let total = 0;
  for (const it of items) {
    let bestShelf = -1;
    let bestSlot = -1;
    let bestScore = Infinity;
    shelves.forEach((s, si) => {
      s.slots.forEach((sl, k) => {
        const freeH = s.h - sl.top;
        if (sl.w >= it.w - 1e-9 && freeH >= it.h - 1e-9) {
          const score = (sl.w - it.w) * 2 + (freeH - it.h);
          if (score < bestScore) {
            bestScore = score;
            bestShelf = si;
            bestSlot = k;
          }
        }
      });
    });
    if (bestShelf >= 0) {
      const s = shelves[bestShelf];
      const sl = s.slots[bestSlot];
      placements.push({ ...it, x: sl.x, y: s.y + sl.top });
      sl.top += it.h;
      continue;
    }
    // 既存の棚に新しいスロットを横に追加
    let bestLeft = Infinity;
    shelves.forEach((s, si) => {
      const left = usable - s.used - it.w;
      if (it.h <= s.h + 1e-9 && left >= -1e-9 && left < bestLeft) {
        bestLeft = left;
        bestShelf = si;
      }
    });
    if (bestShelf < 0 || bestLeft === Infinity) {
      shelves.push({ y: total, h: it.h, used: 0, slots: [] });
      bestShelf = shelves.length - 1;
      total += it.h;
    }
    const s = shelves[bestShelf];
    s.slots.push({ x: 1 + s.used, w: it.w, top: it.h });
    placements.push({ ...it, x: 1 + s.used, y: s.y });
    s.used += it.w;
  }  return { placements, length: total, width, oversize };
}

function pieceFull(p: Piece) {
  return p.onFold ? mirrorFull(p.poly) : p.poly;
}

function rectOf(p: Piece, ctx: BuildContext) {
  const sa = p.sa ?? ctx.sa;
  const bb = bbox(pieceFull(p));
  return { w: bb.w + sa * 2, h: bb.h + sa * 2 + (p.hemExtra ?? 0) };
}

export function rectsFor(pieces: Piece[], ctx: BuildContext): Rect[] {
  const out: Rect[] = [];
  for (const p of pieces) {
    const { w, h } = rectOf(p, ctx);
    for (let i = 0; i < p.count; i++) out.push({ pieceId: p.id, label: p.name, w, h, mirrored: i % 2 === 1 });
  }
  return out;
}

export interface FabricUse {
  packed: PackResult;
  /** 縮み・柄合わせ・予備を含む必要長(cm、10cm単位切り上げ) */
  need: number;
  efficiency: number;
}

export type PatternMatch = "none" | "small" | "large";
const PATTERN_PCT: Record<PatternMatch, number> = { none: 0, small: 0.06, large: 0.15 };

export function fabricUse(pieces: Piece[], ctx: BuildContext, width: number, pattern: PatternMatch): FabricUse {
  const packed = pack(rectsFor(pieces, ctx), width);
  const raw = packed.length * (1 + ctx.fabric.shrink / 100) * (1 + PATTERN_PCT[pattern]) + 10;
  const need = Math.max(20, Math.ceil(raw / 10) * 10);
  const a = pieces.reduce((s, p) => s + area(pieceFull(p)) * p.count, 0);
  const efficiency = packed.length > 0 ? Math.min(1, a / (width * packed.length)) : 0;
  return { packed, need, efficiency };
}

export interface Estimate {
  main: FabricUse;
  rib?: { need: number; width: number };
  lining?: { need: number; width: number };
  interfacing?: { need: number; width: number };
  alternatives: { width: number; need: number; oversize: boolean }[];
  materials: MaterialItem[];
  warnings: string[];
  threadMeters: number;
}

/** 概算費用(円)。単価は目安で、手元の価格に置き換えられる */
export function costOf(est: Estimate, build: BuildResult, prices: { main: number }) {
  const m = (cm: number) => cm / 100;
  const main = m(est.main.need) * prices.main;
  const rib = est.rib ? m(est.rib.need) * 1200 : 0;
  const lining = est.lining ? m(est.lining.need) * 400 : 0;
  const interfacing = est.interfacing ? m(est.interfacing.need) * 350 : 0;
  const thread = Math.max(1, Math.ceil(est.threadMeters / 160)) * 200;
  const extras = build.extras.filter((e) => e.qty !== "—").length * 250;
  const total = main + rib + lining + interfacing + thread + extras;
  const r = (v: number) => Math.round(v / 10) * 10;
  return { main: r(main), rib: r(rib), lining: r(lining), interfacing: r(interfacing), thread, extras, total: r(total) };
}

const fmtM = (cm: number) => `${(cm / 100).toFixed(cm % 10 === 0 ? 1 : 2)}m`;

export function estimate(
  build: BuildResult,
  ctx: BuildContext,
  opts: { width: number; pattern: PatternMatch; garmentKind: ("woven" | "knit")[]; toile?: boolean },
): Estimate {
  const mainPieces = build.pieces.filter((p) => p.fabric !== "rib" && p.fabric !== "lining");
  const ribPieces = build.pieces.filter((p) => p.fabric === "rib");
  const liningPieces = build.pieces.filter((p) => p.fabric === "lining");
  const main = fabricUse(mainPieces, ctx, opts.width, opts.pattern);
  const warnings: string[] = [];
  if (!opts.garmentKind.includes(ctx.fabric.kind)) {
    warnings.push(
      ctx.fabric.kind === "woven"
        ? "この型紙は伸縮するニット生地向けです。織物(布帛)で作る場合はゆとりを大きくし、衿ぐりに開きが必要です。"
        : "この型紙は織物(布帛)向けです。伸びるニット生地では型崩れ・寸法の変化が起こりやすくなります。",
    );
  }
  if (main.packed.oversize) warnings.push(`布幅 ${opts.width}cm に収まらないパーツがあるため、はぎ合わせ(継ぎ)を想定して計算しています。幅の広い生地の使用を検討してください。`);

  const alternatives = Array.from(new Set([...ctx.fabric.widths, opts.width]))
    .sort((a, b) => a - b)
    .map((w) => {
      const u = fabricUse(mainPieces, ctx, w, opts.pattern);
      return { width: w, need: u.need, oversize: u.packed.oversize };
    });

  let rib: Estimate["rib"];
  if (ribPieces.length > 0) {
    const u = fabricUse(ribPieces, ctx, opts.width, "none");
    rib = { need: Math.max(10, Math.ceil((u.packed.length + 5) / 10) * 10), width: opts.width };
  }

  let lining: Estimate["lining"];
  if (liningPieces.length > 0) {
    const u = fabricUse(liningPieces, { ...ctx, fabric: { ...ctx.fabric, shrink: 2 } }, 92, "none");
    lining = { need: Math.max(20, Math.ceil((u.packed.length * 1.02 + 10) / 10) * 10), width: 92 };
  }

  let interfacing: Estimate["interfacing"];
  const ir: Rect[] = [];
  for (const p of build.pieces) {
    if (!p.interfacing) continue;
    const sa = p.sa ?? ctx.sa;
    const bb = bbox(pieceFull(p));
    const [w, h] = p.interfacingRect ?? [bb.w + sa * 2, bb.h + sa * 2];
    const n = p.interfacingCount ?? p.count;
    for (let i = 0; i < n; i++) ir.push({ pieceId: p.id, label: p.name, w, h });
  }
  if (ir.length > 0) {
    const u = pack(ir, 90);
    interfacing = { need: Math.max(20, Math.ceil((u.length + 5) / 10) * 10), width: 90 };
  }

  // 糸: 縫い線の総延長(各辺は2枚で共有 → 周長合計の半分) × 3(上糸+下糸) × ロス20%
  const perim = build.pieces.reduce((s, p) => s + perimeter(pieceFull(p)) * p.count, 0);
  const threadMeters = Math.ceil(((perim / 2) * 3 * 1.2) / 100 / 10) * 10;

  const materials: MaterialItem[] = [];
  materials.push({
    name: `表布: ${ctx.fabric.name}`,
    qty: `幅${opts.width}cm × ${fmtM(main.need)}`,
    note: `水通し縮み${ctx.fabric.shrink}%${opts.pattern === "none" ? "" : "・柄合わせ余裕"}・予備10cm込み(収まり効率 ${Math.round(main.efficiency * 100)}%)`,
  });
  if (opts.toile) {
    const t = fabricUse(mainPieces, { ...ctx, fabric: { ...ctx.fabric, shrink: 0 } }, 110, "none");
    materials.push({ name: "仮縫い用シーチング(安価な綿の薄地)", qty: `幅110cm × ${fmtM(Math.max(20, Math.ceil((t.packed.length + 10) / 10) * 10))}`, note: "本番の布を裁つ前に試作して寸法・シルエットを確認する分" });
  }
  if (rib) materials.push({ name: "リブ布(または共布)", qty: `幅${rib.width}cm × ${fmtM(rib.need)}`, note: "衿リブ用。専用のリブ生地を使うと伸びが良く綺麗" });
  if (lining) materials.push({ name: "裏地(キュプラ・ポリエステル)", qty: `幅${lining.width}cm × ${fmtM(lining.need)}`, note: "ゆとり分を見込んだ必要量。縫い代はきせ分(1cm)を含む" });
  if (interfacing) materials.push({ name: "接着芯(布に合わせた厚さ)", qty: `幅${interfacing.width}cm × ${fmtM(interfacing.need)}`, note: "ニットにはニット用(伸縮タイプ)を使用" });
  materials.push({
    name: `ミシン糸: ${ctx.fabric.thread}`,
    qty: `${Math.max(1, Math.ceil(threadMeters / 160))}個(200m巻)`,
    note: `縫製に約${threadMeters}m使用の目安。布色に近い色を選ぶ`,
  });
  materials.push({ name: "ミシン針", qty: ctx.fabric.needle });
  materials.push(...build.extras);

  return { main, rib, lining, interfacing, alternatives, materials, warnings, threadMeters };
}
