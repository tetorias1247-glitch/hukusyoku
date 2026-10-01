import type { GarmentDef, Piece, Pt } from "../types";
import { normalize, round1, smooth } from "../geometry";
import { rect, sector } from "./common";

/** ダーツの補助線。total=ダーツ総量, n=本数, 中心線を x0〜x1 の間に等間隔で配置 */
export function dartMarks(total: number, n: number, x0: number, x1: number, depth: number): Pt[][] {
  const out: Pt[][] = [];
  if (total <= 0.3 || n <= 0) return out;
  const w = total / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + ((i + 1) * (x1 - x0)) / (n + 1);
    out.push([[cx - w / 2, 0], [cx, depth], [cx + w / 2, 0]]);
  }
  return out;
}

const zipNote = "コンシールファスナーを付ける開き。";

export const aline: GarmentDef = {
  id: "aline",
  genre: "skirts",
  name: "Aラインスカート(台形)",
  emoji: "👗",
  description: "ダーツ入りの台形スカート。前は「わ」、後ろは中心あき(ファスナー)。",
  suitable: ["woven"],
  params: [
    { key: "length", label: "スカート丈(ウエストから)", unit: "cm", kind: "number", min: 25, max: 100, step: 1, def: () => 60 },
    { key: "hipEase", label: "ヒップのゆとり", unit: "cm", kind: "number", min: 2, max: 20, step: 1, def: () => 6 },
    { key: "waistEase", label: "ウエストのゆとり", unit: "cm", kind: "number", min: 0, max: 6, step: 0.5, def: () => 2 },
    { key: "flare", label: "裾の広がり(1/4あたり)", unit: "cm", kind: "number", min: 0, max: 20, step: 1, def: () => 5, help: "0で膝丈タイト、10以上でフレア" },
  ],
  build(m, p, ctx) {
    const L = Number(p.length);
    const Hq = (m.hip + Number(p.hipEase)) / 4;
    const Wq = (m.waist + Number(p.waistEase)) / 4;
    const flare = Number(p.flare);
    const hl = Math.min(m.waistToHip, L - 10);
    const Tw = Math.max(Wq, Hq - 1); // 上端幅(側線で1cm絞る)
    const D = Tw - Wq; // ダーツ総量
    const hemX = Hq + flare;
    const side = smooth(
      [
        [Tw, 0],
        [Hq, hl],
        [hemX, L],
      ],
      8,
    );
    const raiseF = (m.adj?.tummy ?? 0) * 0.7; // お腹が出ている: 前中心を上げる
    const raiseB = (m.adj?.seat ?? 0) * 0.7; // 出尻: 後ろ中心を上げる
    const polyF: Pt[] = [[0, -raiseF], ...side, [0, L]];
    const polyB: Pt[] = [[0, -raiseB], ...side, [0, L]];
    const nDart = D > 3.2 ? 2 : 1;
    const fm = dartMarks(D, nDart, 0, Tw, 9);
    const bm = dartMarks(D, nDart, 0, Tw, 12);
    const fr = normalize(polyF, fm);
    const bk = normalize(polyB, bm);
    const bandLen = m.waist + Number(p.waistEase) + 3;

    const pieces: Piece[] = [
      { id: "front", name: "前スカート", poly: fr.poly, marks: fr.marks, count: 1, onFold: true, hemExtra: ctx.hem - ctx.sa, note: `左辺(前中心)を「わ」に。ダーツ ${nDart}本 × ${round1(D / nDart)}cm、長さ9cm。` },
      { id: "back", name: "後ろスカート", poly: bk.poly, marks: bk.marks, count: 2, hemExtra: ctx.hem - ctx.sa, note: `左右2枚(後ろ中心で縫い合わせ)。ダーツ ${nDart}本 × ${round1(D / nDart)}cm、長さ12cm。${zipNote}` },
      { id: "band", name: "ウエストベルト", poly: rect(bandLen, 6), count: 1, interfacing: true, note: `長さ=ウエスト+ゆとり+持ち出し3cm、完成幅3cm。` },
    ];
    return {
      pieces,
      extras: [
        { name: "コンシールファスナー", qty: `${Math.round(m.waistToHip + 2)}cm 1本`, note: "後ろ中心に付ける(ウエスト〜ヒップ下が目安)" },
        { name: "スカートホック(ウエスト用)", qty: "1組" },
      ],
      steps: [
        "水通し・地直しをして裁断。ダーツ・合い印・ファスナー止まりの印を付ける。",
        "ダーツを縫い、中心に向かって倒す。",
        "後ろ中心をファスナー止まりまで縫い、コンシールファスナーを付ける。",
        "脇を縫い、縫い代を始末(ロックミシン/ジグザグ)。",
        "ウエストベルトを付け、ホックを付ける。",
        "ハンガーに1日つるして落ち着かせ、裾を三つ折りで始末する。",
      ],
      notes: [
        `ヒップ線は ウエストから ${round1(hl)}cm の位置。ウエスト ${round1(m.waist + Number(p.waistEase))}cm / ヒップ ${round1(m.hip + Number(p.hipEase))}cm / 裾回り ${round1(hemX * 4)}cm`,
      ],
    };
  },
};

export const circle: GarmentDef = {
  id: "circle",
  genre: "skirts",
  name: "サーキュラースカート",
  emoji: "🌀",
  description: "円形に広がるスカート。全円/3/4円/半円を選べます。ウエストはファスナー式。",
  suitable: ["woven"],
  params: [
    {
      key: "angle",
      label: "広がり",
      kind: "select",
      options: [
        { value: "360", label: "全円(360°)" },
        { value: "270", label: "3/4円(270°)" },
        { value: "180", label: "半円(180°)" },
      ],
      def: () => "360",
    },
    { key: "length", label: "スカート丈(ウエストから)", unit: "cm", kind: "number", min: 25, max: 100, step: 1, def: () => 55 },
    { key: "waistEase", label: "ウエストのゆとり", unit: "cm", kind: "number", min: 0, max: 6, step: 0.5, def: () => 1 },
  ],
  build(m, p, ctx) {
    const angle = Number(p.angle);
    const L = Number(p.length);
    const waistC = m.waist + Number(p.waistEase);
    const r = waistC / ((angle * Math.PI) / 180); // ウエスト円の半径
    const R = r + L;
    const n = angle / 90;
    const sec = normalize(sector(r, R, 0, 90));
    const bandLen = waistC + 3;
    const pieces: Piece[] = [
      { id: "sector", name: `扇形パーツ(${angle}°÷${n})`, poly: sec.poly, count: n, hemExtra: ctx.hem - ctx.sa - 1, note: `1/${n}の扇形を${n}枚。内側の弧がウエスト。ウエスト半径 ${round1(r)}cm、裾半径 ${round1(R)}cm。バイアスに伸びるので裾は丈を長めに(1〜2cm)。` },
      { id: "band", name: "ウエストベルト", poly: rect(bandLen, 6), count: 1, interfacing: true, note: "完成幅3cm。長さ=ウエスト+ゆとり+持ち出し3cm。" },
    ];
    return {
      pieces,
      extras: [
        { name: "コンシールファスナー", qty: "20cm 1本", note: "脇または後ろ中心に付ける" },
        { name: "スカートホック", qty: "1組" },
      ],
      steps: [
        "水通し・地直し。扇形は直線の辺を縦地に合わせて裁断する。",
        "扇形を縫い合わせる(1か所はファスナーあき)。",
        "コンシールファスナーを付ける。",
        "ウエストベルトを付け、ホックを付ける。",
        "ハンガーに1〜2日つるして生地を落ち着かせ、水平に裾線を整えてから裾を始末する(巻き縫いが綺麗)。",
      ],
      notes: [
        `裾周り: 約 ${round1(2 * Math.PI * R * (angle / 360))}cm。大きな円は布幅が足りなくなりやすいため、扇形に分けて配置します。`,
      ],
    };
  },
};

export const gathered: GarmentDef = {
  id: "gathered",
  genre: "skirts",
  name: "ギャザースカート(ゴム)",
  emoji: "🧵",
  description: "長方形2枚を縫ってゴムを通すだけの簡単なギャザースカート。",
  suitable: ["woven"],
  params: [
    { key: "length", label: "スカート丈(ウエストから)", unit: "cm", kind: "number", min: 25, max: 110, step: 1, def: () => 65 },
    { key: "ratio", label: "ギャザー倍率(ヒップ寸法に対して)", kind: "number", min: 1.2, max: 3, step: 0.1, def: () => 1.7, help: "1.5〜2.0が標準。多いほどボリュームが出て布も増えます" },
    { key: "tiers", label: "段の数", kind: "select", options: [{ value: "1", label: "1段(ストレート)" }, { value: "2", label: "2段切替" }, { value: "3", label: "3段ティアード" }], def: () => "1" },
  ],
  build(m, p, ctx) {
    const L = Number(p.length);
    const ratio = Number(p.ratio);
    const tiers = Number(p.tiers);
    const pieces: Piece[] = [];
    const total = (m.hip + 6) * ratio; // 最下段の全周
    const tierH = L / tiers;
    for (let i = 0; i < tiers; i++) {
      // 上の段ほど幅が狭い(各段 1.5倍ずつ増える)
      const w = (total / Math.pow(1.5, tiers - 1 - i)) / 2;
      const h = tierH + (i < tiers - 1 ? 0 : 0);
      pieces.push({
        id: `tier${i + 1}`,
        name: tiers === 1 ? "スカート本体" : `${i + 1}段目`,
        poly: rect(round1(w), round1(h)),
        count: 2,
        hemExtra: i === tiers - 1 ? ctx.hem - ctx.sa : 0,
        note: `前後2枚。幅 ${round1(w)}cm(縫い代別)${i > 0 ? "。上端は前の段へギャザーを寄せて接続" : "。上端がウエスト側"}`,
      });
    }
    const bandLen = Math.max(m.waist + 10, m.hip * 0.9);
    pieces.push({ id: "band", name: "ゴム通しベルト", poly: rect(round1(bandLen), 8), count: 1, note: "完成幅3.5cm(ゴム3cm幅用)。輪にして1か所ゴム通し口を残す。" });
    return {
      pieces,
      extras: [
        { name: "平ゴム(3cm幅)", qty: `約 ${Math.round(m.waist - 4)}cm`, note: "ウエスト−4cm程度。試着して調整" },
        { name: "ゴム通し", qty: "1" },
      ],
      steps: [
        "水通し・地直しをして長方形を裁断(定規とチャコで直線に)。",
        "段切替の場合: 各段の上端に粗いミシンを2本かけ、ギャザーを寄せて上の段に合わせて縫う。",
        "前後を脇で縫い合わせ、縫い代を始末。",
        "上端にギャザーを寄せ、ゴム通しベルトに均等に縫い付ける。",
        "ゴムを通して端を縫い留める。",
        "裾を三つ折りで始末する。",
      ],
      notes: [`最下段の全周 ${round1(total)}cm(ヒップ ${m.hip}cm に対して ${ratio}倍)。`],
    };
  },
};
