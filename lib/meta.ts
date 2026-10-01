import type { BuildResult, FabricPreset, GarmentDef } from "./types";

/** 生地ごとの扱い方(一般的な目安。必ず手元の生地の品質表示・洗濯表示に従ってください) */
export interface FabricInfo {
  price: number; // 円/m 目安
  iron: string;
  stitch: string;
  finish: string;
  prep: string;
  care: string;
}

export const FABRIC_INFO: Record<string, FabricInfo> = {
  broad: {
    price: 600,
    iron: "高温(180〜200℃)・スチームOK",
    stitch: "縫い目 2.5mm",
    finish: "ロックミシン/ジグザグ、折り伏せ縫い",
    prep: "水通し → 陰干し → アイロンで布目を整える(地直し)",
    care: "洗濯機可(ネット使用)。縮みや色落ちは事前に確認",
  },
  linen: {
    price: 1500,
    iron: "高温(200℃)・霧吹きで湿らせて",
    stitch: "縫い目 2.5mm",
    finish: "ほつれやすいので袋縫い/ロックミシン",
    prep: "水通し(縮みが大きい)。しわは湿らせてアイロン",
    care: "洗濯機可。乾燥機は縮むので避ける",
  },
  gauze: {
    price: 700,
    iron: "中〜高温(150〜180℃)・当て布",
    stitch: "縫い目 3.0mm(ゆるめ)",
    finish: "袋縫い/折り伏せ縫い(透けるので内側をきれいに)",
    prep: "水通し必須(縮みが大きい)。布端のほつれ糸を整える",
    care: "洗濯機可。洗うほど柔らかくなる",
  },
  denim: {
    price: 1300,
    iron: "高温(200℃)",
    stitch: "縫い目 3.0mm / ステッチ 3.5〜4.0mm",
    finish: "ロックミシン/折り伏せ縫い。重なる部分は金づちで叩いてから縫う",
    prep: "水通し(縮み・色落ちあり)。単独で洗う",
    care: "色移りに注意。単独洗い",
  },
  wool: {
    price: 2400,
    iron: "中温(150℃)・当て布+スチーム(押さえるように)",
    stitch: "縫い目 2.5〜3.0mm",
    finish: "ロックミシン/割り伏せ。厚地は縫い代を割ってアイロン",
    prep: "スチームで地直し(水通し不可の生地が多い。洗濯表示を確認)",
    care: "ドライクリーニング推奨(表示に従う)",
  },
  poly: {
    price: 600,
    iron: "低〜中温(110〜150℃)・当て布",
    stitch: "縫い目 2.0〜2.5mm(薄地は細かく)",
    finish: "袋縫い/ロックミシン。すべるのでクリップで留める",
    prep: "縮みは少ない。水通しは省略可(念のため確認)",
    care: "洗濯機可。高温アイロン注意",
  },
  jersey: {
    price: 900,
    iron: "中温(150℃)・滑らせず軽く押さえる(伸び防止)",
    stitch: "ニット用ジグザグ(幅1.0 / 長さ2.5〜3.0mm)または伸縮ステッチ",
    finish: "ロックミシン(3〜4本糸)。肩・衿は伸び止めテープ",
    prep: "水通しして布端を整える。縦方向(ウェール)を確認",
    care: "洗濯機可(ネット)。乾燥機は縮む",
  },
  sweat: {
    price: 1100,
    iron: "中温(150℃)・当て布",
    stitch: "ニット用ジグザグ(長さ3.0mm)",
    finish: "ロックミシン。裏毛は縫い代の段差を小さく",
    prep: "水通し(縮み大)。リブ生地も同じ条件で",
    care: "洗濯機可。乾燥機は縮みやすい",
  },
  chino: {
    price: 900,
    iron: "高温(200℃)",
    stitch: "縫い目 3.0mm / ステッチ 3.5mm",
    finish: "ロックミシン/折り伏せ縫い",
    prep: "水通し(縮みあり)",
    care: "洗濯機可",
  },
  ponte: {
    price: 1100,
    iron: "中温(150℃)・当て布",
    stitch: "ニット用ジグザグ/伸縮ステッチ",
    finish: "ロックミシン。縫い代は割ってアイロン",
    prep: "水通し",
    care: "洗濯機可(ネット)",
  },
  tanmono: {
    price: 1000,
    iron: "高温(180〜200℃)・霧吹き",
    stitch: "ミシンなら 2.5mm。手縫いは並縫い 2〜3mm",
    finish: "袋縫い/折り伏せ縫い。和裁は耳を利用した始末(耳端)",
    prep: "地直し(水通し)。反物の端(耳)を揃えて布目を整える",
    care: "洗濯ネット使用・陰干し。糊を戻す場合は軽く",
  },
};

export const getFabricInfo = (f: FabricPreset): FabricInfo =>
  FABRIC_INFO[f.id] ?? { price: 800, iron: "—", stitch: "2.5mm", finish: "ロックミシン/ジグザグ", prep: "水通し", care: "洗濯表示に従う" };

/** 難易度(1〜5)と所要時間(初心者の目安・時間)。個人差が大きい目安です。 */
export const GARMENT_META: Record<string, { level: number; hours: [number, number] }> = {
  tshirt: { level: 2, hours: [3, 5] },
  longtee: { level: 2, hours: [3, 5] },
  tank: { level: 2, hours: [2, 4] },
  shirt: { level: 4, hours: [10, 16] },
  shortshirt: { level: 4, hours: [8, 12] },
  overshirt: { level: 3, hours: [8, 12] },
  sweat: { level: 2, hours: [4, 7] },
  hoodie: { level: 3, hours: [7, 10] },
  cardigan: { level: 3, hours: [6, 9] },
  vest: { level: 3, hours: [7, 10] },
  pants: { level: 4, hours: [8, 14] },
  widepants: { level: 3, hours: [6, 10] },
  halfpants: { level: 2, hours: [3, 5] },
  shortpants: { level: 3, hours: [5, 8] },
  easypants: { level: 2, hours: [4, 6] },
  gaucho: { level: 2, hours: [4, 6] },
  aline: { level: 3, hours: [4, 7] },
  tight: { level: 3, hours: [4, 7] },
  mini: { level: 3, hours: [3, 6] },
  circle: { level: 2, hours: [4, 6] },
  semicircle: { level: 2, hours: [3, 5] },
  gathered: { level: 1, hours: [2, 3] },
  tiered: { level: 2, hours: [3, 5] },
  dress: { level: 3, hours: [8, 12] },
  "dress-short": { level: 3, hours: [9, 14] },
  "dress-long": { level: 3, hours: [9, 14] },
  tunic: { level: 2, hours: [5, 8] },
  shirtdress: { level: 4, hours: [14, 20] },
  jacket: { level: 5, hours: [20, 35] },
  coat: { level: 5, hours: [25, 40] },
  longcardigan: { level: 3, hours: [6, 9] },
  yukata: { level: 4, hours: [12, 25] },
  jinbei: { level: 2, hours: [5, 8] },
  apron: { level: 1, hours: [1, 2] },
};

/** 必要な道具(生地・作る服に応じて) */
export function toolsFor(g: GarmentDef, f: FabricPreset, b: BuildResult): string[] {
  const t = ["ミシン(直線縫い)", "裁ちばさみ", "糸切りばさみ", "メジャー・方眼定規(60cm)", "チャコペン(またはチャコペーパー+ルレット)", "まち針・クリップ", "アイロン・アイロン台", "リッパー(縫い直し用)", "目打ち"];
  if (f.kind === "knit") t.push("ニット用ミシン針(ボールポイント)", "ロックミシン(またはミシンの伸縮ステッチ)", "ウォーキングフット(送り歯の補助・あれば)");
  else t.push("ロックミシン(またはジグザグ縫い/ピンキングばさみ)");
  if (b.pieces.some((p) => p.interfacing)) t.push("当て布(接着芯を貼るとき)");
  if (b.pieces.some((p) => p.fabric === "lining")) t.push("裏地用の細い針(9号)");
  if (b.pieces.some((p) => p.marks && p.marks.length > 0)) t.push("チャコ・ルレット(ダーツの印付け)");
  if (/コンシール/.test(b.extras.map((e) => e.name).join(""))) t.push("コンシールファスナー押さえ");
  if (/ボタン/.test(b.extras.map((e) => e.name).join(""))) t.push("ボタンホール押さえ(ミシンの機能)");
  if (g.genre === "wafuku") t.push("絹針・木綿針(手縫い用)", "指ぬき", "くけ台(あれば)", "しつけ糸", "鯨尺または60cm定規(和裁)");
  if (b.pieces.some((p) => p.id === "hood" || p.fabric === "rib")) t.push("ゴム通し・紐通し(必要に応じて)");
  return Array.from(new Set(t));
}

export function levelLabel(n: number) {
  return ["", "とても簡単(初めての人向け)", "やさしい", "ふつう", "やや難しい", "難しい(経験者向け)"][n] ?? "";
}
