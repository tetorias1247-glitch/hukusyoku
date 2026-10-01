import type { FabricPreset, Measures } from "./types";

export interface SizePreset {
  id: string;
  label: string;
  group: "women" | "men" | "kids";
  bust: number;
  waist: number;
  hip: number;
  height: number;
}

/** 日本の既製服サイズ(JIS L 4005 / L 4004 の標準体型を元にした目安値。メーカーにより差があります) */
export const SIZES: SizePreset[] = [
  { id: "w5", label: "レディース 5号 (XS)", group: "women", bust: 77, waist: 58, hip: 85, height: 154 },
  { id: "w7", label: "レディース 7号 (S)", group: "women", bust: 80, waist: 61, hip: 88, height: 158 },
  { id: "w9", label: "レディース 9号 (M)", group: "women", bust: 83, waist: 64, hip: 91, height: 158 },
  { id: "w11", label: "レディース 11号 (L)", group: "women", bust: 86, waist: 67, hip: 94, height: 158 },
  { id: "w13", label: "レディース 13号 (LL)", group: "women", bust: 89, waist: 70, hip: 97, height: 158 },
  { id: "w15", label: "レディース 15号 (3L)", group: "women", bust: 92, waist: 73, hip: 100, height: 158 },
  { id: "k80", label: "キッズ 80cm", group: "kids", bust: 48, waist: 47, hip: 49, height: 80 },
  { id: "k90", label: "キッズ 90cm", group: "kids", bust: 52, waist: 50, hip: 54, height: 90 },
  { id: "k100", label: "キッズ 100cm", group: "kids", bust: 56, waist: 52, hip: 58, height: 100 },
  { id: "k110", label: "キッズ 110cm", group: "kids", bust: 60, waist: 54, hip: 62, height: 110 },
  { id: "k120", label: "キッズ 120cm", group: "kids", bust: 64, waist: 56, hip: 66, height: 120 },
  { id: "k130", label: "キッズ 130cm", group: "kids", bust: 68, waist: 59, hip: 72, height: 130 },
  { id: "k140", label: "キッズ 140cm", group: "kids", bust: 72, waist: 62, hip: 77, height: 140 },
  { id: "mS", label: "メンズ S", group: "men", bust: 88, waist: 76, hip: 92, height: 165 },
  { id: "mM", label: "メンズ M", group: "men", bust: 92, waist: 80, hip: 96, height: 170 },
  { id: "mL", label: "メンズ L", group: "men", bust: 96, waist: 84, hip: 100, height: 175 },
  { id: "mLL", label: "メンズ LL", group: "men", bust: 100, waist: 88, hip: 104, height: 175 },
];

/** バスト・ウエスト・ヒップ・身長から、型紙に必要な残りの寸法を推定する */
export function deriveMeasures(base: Pick<Measures, "bust" | "waist" | "hip" | "height">, men: boolean): Measures {
  const { bust, waist, hip, height } = base;
  if (height < 150) {
    // 子ども体型: 背丈は 身長÷4(90cm前後)、−1(110cm前後)、−1.5(130cm前後)
    const back = height <= 95 ? height / 4 : height <= 115 ? height / 4 - 1 : height / 4 - 1.5;
    return {
      ...base,
      men: false,
      kid: true,
      shoulder: Math.round((bust * 0.2 + 14) * 2) / 2,
      backLength: Math.round(back * 2) / 2,
      arm: Math.round(height * 0.3),
      inseam: Math.round(height * 0.4),
      waistToHip: Math.round(height * 0.1),
      crotchDepth: Math.round(hip / 4 + 3.5),
      wrist: Math.round((9.5 + height * 0.02) * 2) / 2,
      neck: Math.round(bust / 2.4),
    };
  }
  return {
    ...base,
    men,
    shoulder: Math.round((men ? bust * 0.1 + 35 : bust * 0.1 + 30) * 2) / 2,
    backLength: Math.round(height * (men ? 0.255 : 0.24)),
    arm: Math.round(height * 0.33),
    inseam: Math.round(height * (men ? 0.46 : 0.45)),
    waistToHip: men ? 20 : 19,
    crotchDepth: Math.round(hip / 4 + 3),
    wrist: men ? 17 : 15,
    neck: Math.round(bust / 2.4 + (men ? 3 : 0)),
  };
}
export const FABRICS: FabricPreset[] = [
  {
    id: "broad",
    name: "コットン(ブロード・ローン)",
    kind: "woven",
    width: 110,
    widths: [110, 112, 140],
    shrink: 5,
    needle: "ミシン針 9〜11号",
    thread: "ポリエステル#60",
    note: "シャツ・ブラウス・スカートの定番。必ず水通し・地直しをしてから裁断。",
  },
  {
    id: "linen",
    name: "リネン(麻)",
    kind: "woven",
    width: 110,
    widths: [110, 140, 150],
    shrink: 6,
    needle: "ミシン針 11号",
    thread: "ポリエステル#60(または麻糸)",
    note: "ほつれやすいので縫い代の始末を丁寧に。洗うと縮みが大きめ。",
  },
  {
    id: "gauze",
    name: "ダブルガーゼ",
    kind: "woven",
    width: 105,
    widths: [105, 110],
    shrink: 8,
    needle: "ミシン針 9号",
    thread: "ポリエステル#60",
    note: "縮みが大きいので水通し必須。ずれやすいのでクリップ留め推奨。",
  },
  {
    id: "denim",
    name: "デニム(8〜12oz)",
    kind: "woven",
    width: 110,
    widths: [110, 140, 150],
    shrink: 7,
    needle: "ミシン針 14号(デニム用)",
    thread: "ポリエステル#30(ステッチ)/#60",
    note: "厚手。縫い代が重なる部分は金づちで叩いてから縫う。",
  },
  {
    id: "wool",
    name: "ウール(ギャバ・ツイード)",
    kind: "woven",
    width: 150,
    widths: [140, 150],
    shrink: 3,
    needle: "ミシン針 11号",
    thread: "ポリエステル#60",
    note: "スチームで地直し(水通し不可の場合あり)。毛並みがあれば一方向裁ち。",
  },
  {
    id: "poly",
    name: "ポリエステル(ジョーゼット・タフタ)",
    kind: "woven",
    width: 112,
    widths: [112, 148, 150],
    shrink: 1,
    needle: "ミシン針 9号(薄地)",
    thread: "ポリエステル#90",
    note: "すべりやすいので薄紙を敷いて縫うときれい。縮みはほぼなし。",
  },
  {
    id: "chino",
    name: "コットンツイル(チノ・ギャバ)",
    kind: "woven",
    width: 110,
    widths: [110, 135, 150],
    shrink: 5,
    needle: "ミシン針 11〜14号",
    thread: "ポリエステル#60(ステッチは#30)",
    note: "パンツ・ジャケットに向く中厚地。縫い代が重なる所は段差に注意。",
  },
  {
    id: "ponte",
    name: "ポンチ(ダブルニット)",
    kind: "knit",
    width: 150,
    widths: [140, 150],
    shrink: 4,
    needle: "ニット用ミシン針 11号",
    thread: "ニット用ミシン糸 #50",
    note: "安定した厚手ニット。カーディガンやスカート向き。",
  },
  {
    id: "tanmono",
    name: "反物(浴衣・綿/綿麻 幅38cm)",
    kind: "woven",
    width: 38,
    widths: [36, 38, 40],
    shrink: 4,
    needle: "ミシン針 11号 / 和裁は絹針・木綿針",
    thread: "綿または絹糸(手縫い用 30番)",
    note: "並幅の反物。長さは12m前後が一般的。必ず地直し(水通し)を。",
  },
  {
    id: "jersey",
    name: "天竺ニット(Tシャツ生地)",
    kind: "knit",
    width: 160,
    widths: [150, 160, 180],
    shrink: 5,
    needle: "ニット用ミシン針(ボールポイント)11号",
    thread: "ニット用ミシン糸 #50(伸びる糸)",
    note: "ジグザグか伸縮縫い。裾・袖口は伸びを防ぐため伸び止めテープを。",
  },
  {
    id: "sweat",
    name: "スウェット・裏毛",
    kind: "knit",
    width: 160,
    widths: [150, 160, 175],
    shrink: 6,
    needle: "ニット用ミシン針 14号",
    thread: "ニット用ミシン糸 #50",
    note: "厚手のため縫い代が重なる所は段差に注意。リブ布を別途用意。",
  },
];

export const getFabric = (id: string) => FABRICS.find((f) => f.id === id) ?? FABRICS[0];
