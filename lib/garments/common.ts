import type { Measures, Pt } from "../types";
import { arc, cubic, pathLength, quad, rad, smooth } from "../geometry";

export const rect = (w: number, h: number): Pt[] => [
  [0, 0],
  [w, 0],
  [w, h],
  [0, h],
];

export interface BodiceOpts {
  /** バスト全周のゆとり(cm) */
  ease: number;
  /** 肩(首側の肩先)から裾までの長さ */
  length: number;
  /** 衿ぐり幅の加算(cm) */
  neckAdd?: number;
  /** 前衿ぐりの深さ。省略時は 文化式(衿ぐり幅+0.5) */
  frontNeckDepth?: number;
  /** 肩幅の加算(落ち肩) */
  shoulderAdd?: number;
  /** ウエストのゆとり。指定するとウエストを絞った形になる */
  waistEase?: number;
  /** ヒップのゆとり(waistEase 指定時) */
  hipEase?: number;
  /** 1/4あたりの裾の広がり(cm) */
  flare?: number;
  /** 前端の持ち出し(シャツ)。0なら中心(わ or 中心縫い) */
  frontExt?: number;
}

export interface Bodice {
  /** 前身頃。fold=true のとき先頭と末尾が x=0 上 */
  front: (opts?: { fold?: boolean }) => Pt[];
  back: (opts?: { fold?: boolean }) => Pt[];
  armholeLen: number; // 前後合計の袖ぐり寸法
  frontNeckLen: number; // 前衿ぐり(半分)
  backNeckLen: number; // 後ろ衿ぐり(半分)
  neckCircumference: number;
  armholeDepth: number;
  quarterBust: number;
  hemQuarter: number;
  sideSeamLen: number;
  /** 袖ぐり曲線(前・後) */
  armholeFront: Pt[];
  armholeBack: Pt[];
}

/** 衿ぐり幅の基準(大人: B/24+3.4 / 子ども: B/20+2.5) */
export const neckW = (m: Measures) => (m.kid ? m.bust / 20 + 2.5 : m.bust / 24 + 3.4);

/** 文化式原型を参考にした簡易身頃ドラフト(座標: x=中心から側へ, y=肩の首側点から下へ) */
export function bodice(m: Measures, o: BodiceOpts): Bodice {
  const adj = m.adj;
  const d = adj?.bustBalance ?? 0; // 前身頃の幅を広く(+)/後ろを広く(−)
  const W = (m.bust + o.ease) / 4; // 1/4身幅
  const Wf = W + d;
  const Wb = W - d;
  const nwBase = neckW(m); // 衿ぐり幅(文化式)
  const nw = nwBase + (o.neckAdd ?? 0) + (adj?.neck ?? 0);
  const bnd = nwBase / 3; // 後ろ衿ぐり深さ
  const fnd = o.frontNeckDepth ?? nwBase + 0.5;
  const ad = m.kid ? m.bust / 4 + 0.5 : m.bust / 12 + 13.7; // 袖ぐり深さ(文化式)
  let sh = m.shoulder / 2 + (o.shoulderAdd ?? 0);
  sh = Math.min(sh, Math.min(Wf, Wb) - 1.5);
  const slopeAdd = adj?.slope ?? 0; // なで肩(+)/いかり肩(−)
  const slopeF = Math.max(1.5, (sh - nw) * Math.tan(rad(22)) + slopeAdd);
  const slopeB = Math.max(1, (sh - nw) * Math.tan(rad(18)) + slopeAdd);
  const L = Math.max(o.length, ad + 10);
  const flare = o.flare ?? 0;
  const frontDrop = adj?.frontLen ?? 0; // 前中心の裾を下げる(+)
  const backDrop = adj?.backLen ?? 0; // 後ろ中心の裾を下げる(+)

  const neckF = quad([0, fnd], [nw * 0.92, fnd], [nw, 0], 16);
  const neckB = quad([0, bnd], [nw * 0.5, bnd], [nw, 0], 12);
  const armF = cubic([sh, slopeF], [sh - 1.6, slopeF + (ad - slopeF) * 0.45], [Wf - 4.2, ad - 0.4], [Wf, ad], 20);
  const armB = cubic([sh, slopeB], [sh - 0.6, slopeB + (ad - slopeB) * 0.45], [Wb - 4.2, ad - 0.4], [Wb, ad], 20);

  // 側線(前後で身幅を変える補正を反映): sgn=+1 前, -1 後ろ
  const sideFor = (sgn: number): { side: Pt[]; hemX: number } => {
    const dd = sgn * d;
    if (o.waistEase !== undefined) {
      const wl = bnd + m.backLength; // ウエスト位置
      const hl = wl + m.waistToHip;
      const Ww = Math.min(W, (m.waist + o.waistEase) / 4);
      const Wh = Math.max(Ww, (m.hip + (o.hipEase ?? 8)) / 4);
      const hx = Math.max(W, Wh) + flare + dd;
      const wlC = Math.min(wl, L - 12);
      const hlC = Math.min(hl, L - 6);
      return {
        side: smooth(
          [
            [W + dd, ad],
            [(W + Ww) / 2 + 0.2 + dd, (ad + wlC) / 2],
            [Ww + dd, wlC],
            [Wh + dd, hlC],
            [hx, L],
          ],
          8,
        ),
        hemX: hx,
      };
    }
    const hx = W + flare + dd;
    return {
      side: [
        [W + dd, ad],
        [hx, L],
      ],
      hemX: hx,
    };
  };
  const sf = sideFor(1);
  const sb = sideFor(-1);

  const ext = o.frontExt ?? 0;

  const buildPoly = (kind: "front" | "back", fold: boolean): Pt[] => {
    const neck = kind === "front" ? neckF : neckB;
    const arm = kind === "front" ? armF : armB;
    const { side, hemX } = kind === "front" ? sf : sb;
    const cy = L + (kind === "front" ? frontDrop : backDrop); // 中心側の裾の位置
    const pts: Pt[] = [];
    if (!fold && ext > 0 && kind === "front") pts.push([-ext, neck[0][1]]);
    pts.push(...neck, ...arm, ...side);
    if (fold) {
      pts.push([0, cy]);
    } else {
      pts.push([hemX, L]);
      pts.push([kind === "front" && ext > 0 ? -ext : 0, cy]);
    }
    return pts;
  };

  return {
    front: (opts) => buildPoly("front", opts?.fold ?? true),
    back: (opts) => buildPoly("back", opts?.fold ?? true),
    armholeLen: pathLength(armF) + pathLength(armB),
    frontNeckLen: pathLength(neckF),
    backNeckLen: pathLength(neckB),
    neckCircumference: 2 * (pathLength(neckF) + pathLength(neckB)),
    armholeDepth: ad,
    quarterBust: W,
    hemQuarter: (sf.hemX + sb.hemX) / 2,
    sideSeamLen: L - ad,
    armholeFront: armF,
    armholeBack: armB,
  };
}
export interface SleeveResult {
  poly: Pt[];
  halfWidth: number;
  capLength: number;
}

/**
 * 袖: 袖山曲線の長さが 袖ぐり(AH)+ゆとり になるよう袖幅を二分法で求める。
 * bicepAdd(上腕の補正)があるときは、袖山の長さは変えずに袖山高さを調整して袖幅を増減する。
 */
export function sleeve(AH: number, capH: number, len: number, hemWidth: number, ease: number, bicepAdd = 0): SleeveResult {
  const cap = (b: number, h: number): Pt[] => [
    ...quad([0, h], [b * 0.45, 0], [b, 0], 14),
    ...quad([b, 0], [b * 1.55, 0], [2 * b, h], 14).slice(1),
  ];
  const target = AH + ease;
  const solveB = (h: number) => {
    let lo = 3;
    let hi = 40;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (pathLength(cap(mid, h)) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  let h = capH;
  let b = solveB(h);
  if (Math.abs(bicepAdd) > 0.01) {
    const want = 2 * b + bicepAdd;
    let lo = 3;
    let hi = capH + 8;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (2 * solveB(mid) > want) lo = mid; // 袖山が高いほど袖幅は狭くなる
      else hi = mid;
    }
    h = (lo + hi) / 2;
    b = solveB(h);
  }
  const top = cap(b, h);
  const L = Math.max(len, h + 5);
  const ix = b - hemWidth / 2;
  const poly: Pt[] = [...top, [2 * b - ix, L], [ix, L]];
  return { poly, halfWidth: b, capLength: pathLength(top) };
}
/** 円の1/4扇形リング(角度 a0→a1)。中心が (0,0) */
export function sector(rInner: number, rOuter: number, a0: number, a1: number): Pt[] {
  return [...arc([0, 0], rInner, a0, a1, 28), ...arc([0, 0], rOuter, a1, a0, 28)];
}
