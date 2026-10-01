import type { Adjust, GarmentDef, Params } from "./types";

export interface AdjustDef {
  key: keyof Adjust;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  help: string;
  /** 選択式(プリセット)にする場合 */
  options?: { value: number; label: string }[];
}

export const ADJUST_DEFS: AdjustDef[] = [
  {
    key: "slope",
    label: "肩の傾斜",
    unit: "cm",
    min: -2,
    max: 2,
    step: 1,
    help: "なで肩=肩先が下がっている/いかり肩=肩が上がって角ばっている。肩線の傾きを補正します。",
    options: [
      { value: -2, label: "いかり肩(強)  −2cm" },
      { value: -1, label: "いかり肩  −1cm" },
      { value: 0, label: "標準" },
      { value: 1, label: "なで肩  +1cm" },
      { value: 2, label: "なで肩(強)  +2cm" },
    ],
  },
  { key: "bustBalance", label: "前身頃を広く(前後バランス)", unit: "cm", min: -2, max: 3, step: 0.5, help: "胸板が厚い・胸が豊かな人は +、背中が広い人は −。身幅の合計は変わらず、脇線が前後に動きます。" },
  { key: "frontLen", label: "前丈の補正", unit: "cm", min: -2, max: 4, step: 0.5, help: "胸が豊かで前裾が上がる人、反り身の人は +。前中心の裾を下げます。" },
  { key: "backLen", label: "後ろ丈の補正", unit: "cm", min: -2, max: 4, step: 0.5, help: "猫背・背中が丸い人で後ろ裾が上がる場合は +。後ろ中心の裾を下げます。" },
  { key: "arm", label: "上腕の太さ", unit: "cm", min: -4, max: 8, step: 0.5, help: "二の腕が太い人は +。袖山の長さは変えず、袖山を低くして袖幅を広げます(袖がある服のみ)。" },
  { key: "neck", label: "首まわり(衿ぐり幅)", unit: "cm", min: -1.5, max: 3, step: 0.5, help: "首が太い・衿が苦しい人は +、細い人は −(衿ぐり幅の半分の値)。" },
  { key: "seat", label: "ヒップ後ろの補正(出尻・平尻)", unit: "cm", min: -3, max: 4, step: 0.5, help: "出尻は +(後ろ中心のウエストを上げ、股ぐりも広げます)、平尻は −。" },
  { key: "tummy", label: "お腹まわりの補正", unit: "cm", min: -2, max: 4, step: 0.5, help: "お腹が出ている人は +。前中心のウエストを上げて、前の丈不足・裾の上がりを防ぎます。" },
  { key: "thigh", label: "太ももまわり", unit: "cm", min: -4, max: 10, step: 1, help: "太ももが太い人は +。股ぐり幅を広げて、突っ張りやしわを防ぎます(パンツ)。" },
];

const BODICE_GENRES = new Set(["tops", "dress", "outer"]);
const SKIRT_ADJ = new Set(["aline", "tight", "mini"]);

/** その服で意味のある補正項目 */
export function adjustKeysFor(g: GarmentDef, p: Params): (keyof Adjust)[] {
  if (BODICE_GENRES.has(g.genre)) {
    const keys: (keyof Adjust)[] = ["slope", "bustBalance", "frontLen", "backLen", "neck"];
    if (g.params.some((d) => d.key === "sleeve") && Number(p.sleeve) > 0) keys.push("arm");
    return keys;
  }
  if (g.genre === "pants") return ["seat", "tummy", "thigh"];
  if (g.genre === "skirts" && SKIRT_ADJ.has(g.id)) return ["seat", "tummy"];
  return [];
}

export function adjustSummary(adj: Adjust, keys: (keyof Adjust)[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = adj[k];
    if (!v) continue;
    const def = ADJUST_DEFS.find((d) => d.key === k)!;
    out.push(`${def.label}: ${v > 0 ? "+" : ""}${v}cm`);
  }
  return out;
}
