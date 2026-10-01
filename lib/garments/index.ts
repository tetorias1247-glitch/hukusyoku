import type { GarmentDef, GenreId } from "../types";
import { tshirt } from "./tshirt";
import { shirt } from "./shirt";
import { dress } from "./dress";
import { aline, circle, gathered } from "./skirts";
import { pants } from "./pants";
import { tank, sweat, hoodie, cardigan, vest } from "./tops";
import { jacket } from "./outer";
import { apron, yukata, jinbei } from "./wear";
import * as v from "./variants";

export const GENRES: { id: GenreId; name: string; emoji: string; desc: string }[] = [
  { id: "tops", name: "トップス", emoji: "👕", desc: "Tシャツ・シャツ・スウェット・カーディガンなど" },
  { id: "pants", name: "パンツ", emoji: "👖", desc: "ストレート・ワイド・ハーフ・ショートなど" },
  { id: "skirts", name: "スカート", emoji: "👗", desc: "台形・タイト・フレア・ギャザーなど" },
  { id: "dress", name: "ワンピース", emoji: "💃", desc: "ワンピース・チュニック・シャツワンピ" },
  { id: "outer", name: "アウター", emoji: "🧥", desc: "ジャケット・コート・ロングカーディガン" },
  { id: "wafuku", name: "和装", emoji: "🎐", desc: "浴衣・甚平(直線裁ち)" },
  { id: "other", name: "小物・その他", emoji: "🍳", desc: "エプロンなど" },
];

export const GARMENTS: GarmentDef[] = [
  // トップス
  tshirt, v.longTee, tank, shirt, v.shortShirt, v.overShirt, sweat, hoodie, cardigan, vest,
  // パンツ
  pants, v.wide, v.halfPants, v.shortPants, v.easyPants, v.gaucho,
  // スカート
  aline, v.tight, v.mini, circle, v.semiCircle, gathered, v.tiered,
  // ワンピース
  dress, v.dressShort, v.dressLong, v.tunic, v.shirtDress,
  // アウター
  jacket, v.coat, v.longCardigan,
  // 和装
  yukata, jinbei,
  // 小物
  apron,
];

export const getGarment = (id: string) => GARMENTS.find((g) => g.id === id) ?? GARMENTS[0];
