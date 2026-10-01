import type { GarmentDef, Piece, Pt } from "../types";
import { normalize, quad, round1, smooth } from "../geometry";
import { rect } from "./common";
import { dartMarks } from "./skirts";

export const pants: GarmentDef = {
  id: "pants",
  genre: "pants",
  preferFabric: "chino",
  name: "パンツ(ストレート/テーパード)",
  emoji: "👖",
  description: "前後各2枚のパンツ。ファスナー式かゴムウエスト、脇ポケット付き。",
  suitable: ["woven"],
  params: [
    {
      key: "style",
      label: "シルエット",
      kind: "select",
      options: [
        { value: "straight", label: "ストレート" },
        { value: "taper", label: "テーパード" },
      ],
      def: () => "straight",
    },
    { key: "waistType", label: "ウエスト", kind: "select", options: [{ value: "zip", label: "ファスナー+ベルト" }, { value: "elastic", label: "総ゴム" }], def: () => "zip" },
    { key: "inseam", label: "股下", unit: "cm", kind: "number", min: 40, max: 95, step: 1, def: (m) => m.inseam, help: "短くするとハーフ・クロップド丈に" },
    { key: "crotch", label: "股上(ウエスト〜股)", unit: "cm", kind: "number", min: 18, max: 40, step: 0.5, def: (m) => m.crotchDepth },
    { key: "hem", label: "裾幅(1脚の全周)", unit: "cm", kind: "number", min: 20, max: 80, step: 1, def: (m) => (m.kid ? Math.round(m.hip * 0.55) : 44), help: "ストレート42〜46 / テーパード36〜40 / ワイド56〜" },
    { key: "hipEase", label: "ヒップのゆとり", unit: "cm", kind: "number", min: 4, max: 30, step: 1, def: () => 8 },
    { key: "pocket", label: "脇ポケット", kind: "select", options: [{ value: "yes", label: "あり" }, { value: "no", label: "なし" }], def: () => "yes" },
  ],
  build(m, p, ctx) {
    const elastic = String(p.waistType) === "elastic";
    const taper = String(p.style) === "taper";
    const inseam = Number(p.inseam);
    const CD = Number(p.crotch);
    const H = m.hip + Number(p.hipEase);
    const hl = Math.min(m.waistToHip, CD - 6);
    const L = CD + inseam;
    const ky = inseam < 14 ? CD + 1.2 + (inseam - 1.2) / 2 : CD + inseam * 0.5 - 2; // ひざ位置(短い丈は股と裾の中間)
    const hemC = Number(p.hem);
    const casing = elastic ? 6 : 0;
    const waistEase = 2;

    const make = (back: boolean) => {
      const Hh = H / 4 + (back ? 1 : -1); // ヒップ線での幅(脇〜中心)
      const adj = m.adj;
      const raise = ((back ? adj?.seat : adj?.tummy) ?? 0) * 0.7; // 出尻/お腹: 中心側のウエストを上げる
      const cw = Math.max(2, (back ? H / 16 : H / 20) + (adj?.thigh ?? 0) / 2 + (back ? (adj?.seat ?? 0) * 0.3 : 0)); // 股ぐり幅(太ももで増減)
      const crotchY = back ? CD + 1.2 : CD;
      const halfHem = hemC / 2 + (back ? 1 : -1);
      const kneeW = halfHem + (taper ? 2.5 : 1.5);
      const xc = (Hh + cw) / 2; // 脚の中心(クリース)線
      const xw = elastic ? 0.4 : 1.8; // 脇のウエスト位置(絞り)
      const waistNet = (m.waist + waistEase) / 4 + (back ? 1 : -1);
      const topX = back ? Hh + 2.5 : Hh; // 中心側のウエスト位置(後ろは斜め)
      const D = Math.max(0, topX - xw - waistNet);
      const nDart = elastic ? 0 : D > 3.4 ? 2 : D > 0.3 ? 1 : 0;

      const crotchPts = back
        ? quad([Hh, CD - 8], [Hh + 0.6, crotchY], [Hh + cw, crotchY], 14)
        : quad([Hh, CD - 6], [Hh, crotchY], [Hh + cw, crotchY], 14);
      const inseamPts = smooth(
        [
          [Hh + cw, crotchY],
          [xc + kneeW / 2, ky],
          [xc + halfHem / 2, L],
        ],
        8,
      );
      const sidePts = smooth(
        [
          [xw, 0],
          [0, hl],
          [xc - kneeW / 2, ky],
          [xc - halfHem / 2, L],
        ],
        8,
      );
      const poly: Pt[] = [];
      if (casing > 0) poly.push([xw, -casing], [topX, -casing - raise]);
      else poly.push([xw, 0]);
      poly.push([topX, -raise]);
      poly.push(...crotchPts);
      poly.push(...inseamPts.slice(1));
      poly.push(...sidePts.slice().reverse());
      const marks = elastic ? [] : dartMarks(D, nDart, xw, topX, back ? 11 : 8);
      return { ...normalize(poly, marks), D, nDart, kneeW, halfHem, Hh, cw };
    };

    const f = make(false);
    const b = make(true);
    const hemX = ctx.hem - ctx.sa;

    const pieces: Piece[] = [
      { id: "front", name: "前パンツ", poly: f.poly, marks: f.marks, count: 2, hemExtra: hemX, interfacing: !elastic, interfacingRect: !elastic ? [6, 22] : undefined, interfacingCount: 2, note: `左右2枚(左右対称)。右端が前中心。${elastic ? "上端の延長部分は ゴム通し(折り返し)分。" : `ダーツ ${f.nDart}本×${round1(f.D / Math.max(1, f.nDart))}cm。`}` },
      { id: "back", name: "後ろパンツ", poly: b.poly, marks: b.marks, count: 2, hemExtra: hemX, note: `左右2枚(左右対称)。右端が後ろ中心(斜め)。${elastic ? "" : `ダーツ ${b.nDart}本×${round1(b.D / Math.max(1, b.nDart))}cm。`}` },
    ];
    if (!elastic) {
      pieces.push({ id: "band", name: "ウエストベルト", poly: rect(round1(m.waist + waistEase + 3.5), 8), count: 1, interfacing: true, note: "完成幅3.5cm。長さ=ウエスト+ゆとり+持ち出し3.5cm。" });
      pieces.push({ id: "fly", name: "前立て(持ち出し・見返し)", poly: rect(5, 20), count: 2, interfacing: true, note: "ファスナー用。持ち出し1・見返し1。" });
    }
    if (String(p.pocket) === "yes") {
      pieces.push({ id: "pocketbag", name: "脇ポケット袋布", poly: rect(16, 24), count: 4, note: "前パンツの脇(ウエスト下)に開き口16cm。袋布4枚(左右×2)。" });
    }

    const extras = elastic
      ? [
          { name: "平ゴム(3cm幅)", qty: `約 ${Math.round(m.waist - 4)}cm`, note: "ウエスト−4cm程度。試着して調整" },
          { name: "ゴム通し", qty: "1" },
        ]
      : [
          { name: "ファスナー(パンツ用・金属または樹脂)", qty: "16〜18cm 1本", note: "前たちあわせ用" },
          { name: "ボタン(15mm)/ スプリングホック", qty: "1", note: "ウエストベルト留め" },
        ];

    return {
      pieces,
      extras,
      steps: [
        "水通し・地直し。デニムなどは縫い代を大きく取らず、始末を考えて裁断。",
        "前パンツにダーツを縫い、ポケット袋布を付ける(脇)。",
        "前中心(股ぐり)を縫い、ファスナーをつける。",
        "後ろダーツ・後ろ股ぐりを縫う。",
        "脇を縫い(ポケットを残す)、続けて股下を縫い合わせる。",
        elastic ? "上端を折ってゴム通し口を残して縫い、ゴムを通す。" : "ウエストベルトを付け、ボタン/ホックを付ける。",
        "裾を三つ折りで始末する。",
      ],
      notes: [
        `ヒップ ${round1(H)}cm(ゆとり込み) / 股上 ${CD}cm / 股下 ${inseam}cm / 裾幅 ${hemC}cm / ひざ幅(前+後) ${round1(f.kneeW + b.kneeW)}cm`,
        "パンツは体型差が出やすいので、安価な布で仮縫い(トワル)をして股上・ヒップを確認してから本裁ちするのがおすすめです。",
      ],
    };
  },
};
