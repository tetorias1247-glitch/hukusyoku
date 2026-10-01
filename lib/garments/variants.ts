import type { GarmentDef, GenreId, Measures, ParamDef } from "../types";
import { tshirt } from "./tshirt";
import { shirt } from "./shirt";
import { dress } from "./dress";
import { aline, circle, gathered } from "./skirts";
import { pants } from "./pants";
import { cardigan } from "./tops";
import { jacket } from "./outer";

interface VariantOpts {
  id: string;
  name: string;
  emoji: string;
  description: string;
  genre?: GenreId;
  preferFabric?: string;
  /** 既存パラメータの初期値・範囲を上書き */
  params: Record<string, Partial<ParamDef> & { def?: (m: Measures) => number | string }>;
}

/** 既存の型紙ロジックを再利用し、初期値だけを変えた別アイテムを作る */
function variant(base: GarmentDef, o: VariantOpts): GarmentDef {
  return {
    ...base,
    id: o.id,
    name: o.name,
    emoji: o.emoji,
    description: o.description,
    genre: o.genre ?? base.genre,
    preferFabric: o.preferFabric ?? base.preferFabric,
    params: base.params.map((p) => (o.params[p.key] ? { ...p, ...o.params[p.key] } : p)),
  };
}

export const longTee = variant(tshirt, {
  id: "longtee",
  name: "長袖Tシャツ(ロンT)",
  emoji: "👚",
  description: "袖を長くした長袖のTシャツ。袖口は二つ折りで始末します。",
  params: { sleeve: { def: (m) => m.arm, help: "手首までの長さ" } },
});

export const shortShirt = variant(shirt, {
  id: "shortshirt",
  name: "半袖シャツ・ブラウス",
  emoji: "👕",
  description: "半袖の前あきシャツ。カフスなし、袖口は三つ折り。",
  params: { sleeve: { def: () => 22 } },
});

export const overShirt = variant(shirt, {
  id: "overshirt",
  name: "オーバーサイズシャツ",
  emoji: "🧥",
  description: "ゆとりを大きくしたドロップ気味のシャツ。羽織りにも。",
  params: {
    ease: { def: () => 28 },
    length: { def: (m) => Math.round(m.height * 0.46) },
  },
});

export const shirtDress = variant(shirt, {
  id: "shirtdress",
  genre: "dress",
  name: "シャツワンピース",
  emoji: "👘",
  description: "シャツの型紙を丈長にした前開きワンピース。ベルトをしてもOK。",
  params: {
    ease: { def: () => 18 },
    length: { def: (m) => Math.round(m.height * 0.65), max: 140 },
  },
});

export const dressShort = variant(dress, {
  id: "dress-short",
  name: "半袖ワンピース",
  emoji: "👗",
  description: "半袖付きのAラインワンピース。後ろ中心ファスナー。",
  params: { sleeve: { def: () => 20 } },
});

export const dressLong = variant(dress, {
  id: "dress-long",
  name: "ロングワンピース(マキシ)",
  emoji: "🥻",
  description: "くるぶし丈のフレアワンピース。広がりが大きいぶん生地も多く必要です。",
  params: {
    length: { def: (m) => Math.round(m.height * 0.8) },
    flare: { def: () => 14 },
  },
});

export const tunic = variant(dress, {
  id: "tunic",
  name: "チュニック",
  emoji: "👚",
  description: "ゆったりした膝上丈のチュニック。半袖付き。",
  params: {
    length: { def: (m) => Math.round(m.height * 0.5) },
    ease: { def: () => 16 },
    waistEase: { def: () => 26 },
    hipEase: { def: () => 20 },
    flare: { def: () => 5 },
    sleeve: { def: () => 20 },
  },
});

export const tight = variant(aline, {
  id: "tight",
  name: "タイトスカート",
  emoji: "👗",
  description: "ヒップに沿ったシルエット。歩きやすいように後ろに10〜15cmのスリットまたはベンツ(別途)を付けてください。",
  params: {
    length: { def: () => 55 },
    hipEase: { def: () => 4 },
    flare: { def: () => 1 },
  },
});

export const mini = variant(aline, {
  id: "mini",
  name: "ミニスカート(台形)",
  emoji: "🩳",
  description: "膝上30cm前後の台形ミニスカート。",
  params: { length: { def: () => 38 }, flare: { def: () => 8 } },
});

export const semiCircle = variant(circle, {
  id: "semicircle",
  name: "セミフレアスカート(半円)",
  emoji: "💠",
  description: "半円(180°)のほどよい広がりのスカート。全円より布が少なくすみます。",
  params: { angle: { def: () => "180" }, length: { def: () => 60 } },
});

export const tiered = variant(gathered, {
  id: "tiered",
  name: "ティアードスカート(ロング)",
  emoji: "🧵",
  description: "3段に切り替えたゴムウエストのロングスカート。",
  params: { tiers: { def: () => "3" }, length: { def: () => 90 } },
});

export const wide = variant(pants, {
  id: "widepants",
  name: "ワイドパンツ",
  emoji: "👖",
  description: "裾幅を広くしたゆったりシルエット。ヒップのゆとり大きめ。",
  params: { hem: { def: (m) => (m.kid ? Math.round(m.hip * 0.95) : 62) }, hipEase: { def: () => 16 }, style: { def: () => "straight" } },
});

export const halfPants = variant(pants, {
  id: "halfpants",
  name: "ハーフパンツ(ゴム)",
  emoji: "🩳",
  description: "膝上〜膝丈のゴムウエストのパンツ。甚平のズボンやルームウェアにも。",
  genre: "pants",
  params: {
    inseam: { def: (m) => (m.kid ? Math.round(m.inseam * 0.5) : 25), min: 4 },
    hem: { def: (m) => (m.kid ? Math.round(m.hip * 0.95) : 60) },
    hipEase: { def: () => 16 },
    waistType: { def: () => "elastic" },
  },
});

export const shortPants = variant(pants, {
  id: "shortpants",
  name: "ショートパンツ",
  emoji: "🩳",
  description: "股下の短いファスナー付きショートパンツ。",
  params: {
    inseam: { def: (m) => (m.kid ? 5 : 8), min: 4 },
    hem: { def: (m) => (m.kid ? Math.round(m.hip * 0.9) : 58) },
    hipEase: { def: () => 12 },
  },
});

export const easyPants = variant(pants, {
  id: "easypants",
  name: "イージーパンツ(テーパード)",
  emoji: "🧘",
  description: "総ゴムでテーパードのリラックスパンツ。",
  params: {
    style: { def: () => "taper" },
    hem: { def: (m) => (m.kid ? Math.round(m.hip * 0.5) : 36) },
    hipEase: { def: () => 14 },
    waistType: { def: () => "elastic" },
  },
});

export const gaucho = variant(pants, {
  id: "gaucho",
  name: "ガウチョパンツ",
  emoji: "👖",
  description: "ふくらはぎ丈の幅広パンツ。",
  params: {
    inseam: { def: (m) => Math.round(m.inseam * 0.7), min: 20 },
    hem: { def: (m) => (m.kid ? Math.round(m.hip * 1.1) : 78), max: 120 },
    hipEase: { def: () => 20 },
    waistType: { def: () => "elastic" },
  },
});

export const longCardigan = variant(cardigan, {
  id: "longcardigan",
  genre: "outer",
  name: "ロングカーディガン(ガウン)",
  emoji: "🧥",
  description: "ひざ丈前後のロング丈カーディガン。羽織りに。",
  params: {
    length: { def: (m) => Math.round(m.height * 0.62) },
    ease: { def: () => 22 },
    buttons: { def: () => 0 },
  },
});

export const coat = variant(jacket, {
  id: "coat",
  name: "コート(ノーカラー・ロング)",
  emoji: "🧥",
  description: "ひざ丈のAラインコート。裏地付き。",
  preferFabric: "wool",
  params: {
    length: { def: (m) => Math.round(m.height * 0.65) },
    ease: { def: () => 30 },
    flare: { def: () => 5 },
    buttons: { def: (m) => Math.max(3, Math.round((m.height * 0.65) / 20)) },
  },
});
