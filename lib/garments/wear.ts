import type { GarmentDef, Piece } from "../types";
import { round1 } from "../geometry";
import { rect } from "./common";

/** 縫い代込みの裁断寸法 (w×h) から、仕上がり寸法の長方形を作る */
const cut = (w: number, h: number, sa: number) => rect(round1(Math.max(1, w - 2 * sa)), round1(Math.max(1, h - 2 * sa)));

export const apron: GarmentDef = {
  id: "apron",
  genre: "other",
  name: "エプロン(胸当て付き)",
  emoji: "🍳",
  description: "直線だけで作れる胸当てエプロン。首ひも・腰ひも・ポケット付き。",
  suitable: ["woven"],
  params: [
    { key: "bibW", label: "胸当ての幅", unit: "cm", kind: "number", min: 20, max: 50, step: 1, def: () => 30 },
    { key: "bibH", label: "胸当ての丈", unit: "cm", kind: "number", min: 20, max: 60, step: 1, def: () => 35 },
    { key: "skirtW", label: "スカート部分の幅", unit: "cm", kind: "number", min: 40, max: 120, step: 1, def: (m) => Math.round(m.waist + 8) },
    { key: "skirtL", label: "スカート部分の丈", unit: "cm", kind: "number", min: 30, max: 100, step: 1, def: () => 55 },
    { key: "pocket", label: "ポケット", kind: "select", options: [{ value: "yes", label: "あり" }, { value: "no", label: "なし" }], def: () => "yes" },
  ],
  build(m, p, ctx) {
    const pieces: Piece[] = [
      { id: "bib", name: "胸当て", poly: rect(Number(p.bibW), Number(p.bibH)), count: 1, hemExtra: 0, note: "上端と脇は三つ折り、下端はスカートに縫い付ける。" },
      { id: "skirt", name: "スカート部分", poly: rect(Number(p.skirtW), Number(p.skirtL)), count: 1, hemExtra: ctx.hem - ctx.sa, note: "上端にタックまたはギャザーを寄せて胸当てと腰ひもに付ける。" },
      { id: "neck", name: "首ひも", poly: rect(65, 6), count: 1, note: "幅6cmを四つ折りにして仕上がり1.5cm。長さは調整可(首にかけて留める場合は70cm)。" },
      { id: "tie", name: "腰ひも", poly: rect(95, 6), count: 2, note: "左右各1本。四つ折りで仕上がり1.5cm。" },
    ];
    if (String(p.pocket) === "yes") pieces.push({ id: "pocket", name: "ポケット", poly: rect(18, 17), count: 1, note: "仕上がり 16×15cm。上端三つ折り。" });
    return {
      pieces,
      extras: [{ name: "(任意)金属リング・調整パーツ", qty: "2個", note: "首ひもの長さ調整用" }],
      steps: ["水通し・地直し。", "ひも類を縫って表に返す。", "ポケットを作って付ける。", "スカート上端にタックを寄せ、胸当て・腰ひもを挟んで縫う。", "裾と脇を三つ折りで始末する。"],
      notes: ["すべて直線裁ちのため、型紙なしで直接布に線を引いて裁てます。"],
    };
  },
};

export const yukata: GarmentDef = {
  id: "yukata",
  genre: "wafuku",
  preferFabric: "tanmono",
  name: "浴衣(女物・直線裁ち)",
  emoji: "🎐",
  description: "反物(幅約38cm)から身頃・袖・おくみ・衿・共衿を直線で裁つ和裁。帯・腰ひもは含みません。",
  suitable: ["woven"],
  params: [
    { key: "bodyHalf", label: "身頃の片側裁ち長さ(身長+11cm)", unit: "cm", kind: "number", min: 100, max: 220, step: 1, def: (m) => m.height + 11, help: "身丈+くりこし・衿付け込み・裾縫い代を含む(肩山で二つ折りにして前後を取る)" },
    { key: "sleeve", label: "袖丈", unit: "cm", kind: "number", min: 40, max: 65, step: 1, def: () => 49 },
    { key: "okumi", label: "おくみの長さ", unit: "cm", kind: "number", min: 60, max: 200, step: 1, def: (m) => Math.round(m.height * 0.76), help: "裾からおくみ上端(衿肩あき付近)まで+縫い代" },
    { key: "eri", label: "衿の長さ", unit: "cm", kind: "number", min: 100, max: 220, step: 1, def: (m) => m.height + 5 },
  ],
  build(m, p, ctx) {
    const W = ctx.width; // 反物幅
    const usable = W - 2;
    const sa = ctx.sa;
    const bodyHalf = Number(p.bodyHalf);
    const sleeveCut = 2 * (Number(p.sleeve) + 6);
    const eriW = Math.floor((W + 1) / 3);
    const okW = Math.floor(usable / 2 - 2);
    const pieces: Piece[] = [
      { id: "mi", name: "身頃", poly: cut(usable, bodyHalf * 2, sa), count: 2, note: `肩山(長さの中央)で二つ折り。右身頃・左身頃の2枚。片側 ${bodyHalf}cm×2。くりこし(肩山から裾へ3cmずらす)に注意。` },
      { id: "sode", name: "袖", poly: cut(usable, sleeveCut, sa), count: 2, note: `袖丈 ${Number(p.sleeve)}cm の二つ折り(袖山で折る)。袖付け・袖口あきは後で印付け。` },
      { id: "okumi", name: "おくみ", poly: cut(okW + 2 * sa, Number(p.okumi), sa), count: 2, note: "前身頃の前端に付ける幅の狭い布。剣先は斜めに裁つ。" },
      { id: "eri", name: "衿(棒衿)", poly: cut(eriW, Number(p.eri), sa), count: 1, note: `反物幅のおよそ1/3(${eriW}cm)で裁つ。` },
      { id: "tomoeri", name: "共衿(かけ衿)", poly: cut(eriW, 55, sa), count: 1, note: "衿の上にかける取り替え用の衿。省略可。" },
    ];
    return {
      pieces,
      extras: [
        { name: "しつけ糸・手縫い糸(30番)", qty: "各1巻", note: "和裁は手縫い仕立て。ミシンは並縫いの代わりに使用可" },
        { name: "衿芯(バチ衿・襦袢用)", qty: "1本", note: "任意" },
        { name: "(別途)帯・腰ひも・下駄", qty: "—", note: "この計算には含みません" },
      ],
      steps: [
        "反物を水通し・地直し(布目を整える)。",
        "身頃・袖・おくみ・衿を印の通りに裁断。",
        "袖を縫い、袖付け止まりまで袖口あきを作る。",
        "身頃の背縫いをして、おくみを付ける。",
        "肩山の縫い代を割り、衿を付ける。",
        "袖を身頃に付け、脇を縫う。",
        "裾・袖口を三つ折りで始末し、衿を整える。",
      ],
      notes: [
        "寸法は一般的な女物浴衣の直線裁ち(身頃は身長+11cm)に基づく目安です。体型・反物幅により変わります。",
        "並幅の反物は約12m(1反)で、1着分は約11〜12mです。必要量が12mを超えるときは身長が高め・または柄合わせが必要です。",
        `反物幅 ${W}cm を使用: 衿幅 ${eriW}cm・おくみ幅 約${okW}cm。`,
      ],
    };
  },
};

export const jinbei: GarmentDef = {
  id: "jinbei",
  genre: "wafuku",
  preferFabric: "broad",
  name: "甚平(上衣・直線裁ち)",
  emoji: "🎋",
  description: "長方形だけで作る甚平の上衣(身頃・袖・衿・ひも)。ズボンは「ハーフパンツ(ゴム)」を選んで作ります。",
  suitable: ["woven"],
  params: [
    { key: "type", label: "体型の基準", kind: "select", options: [{ value: "women", label: "女物" }, { value: "men", label: "男物" }], def: (m) => (m.men ? "men" : "women") },
    { key: "len", label: "着丈(身頃の片側)", unit: "cm", kind: "number", min: 50, max: 110, step: 1, def: (m) => Math.round(m.height * 0.5) + (m.men ? 4 : 1), help: "裁ち長さ = 着丈×2(肩で二つ折り)" },
    { key: "wid", label: "身頃の幅", unit: "cm", kind: "number", min: 30, max: 70, step: 1, def: (m) => Math.round(m.bust / 2 + 3.5) },
    { key: "sleeve", label: "袖丈", unit: "cm", kind: "number", min: 30, max: 65, step: 1, def: (m) => (m.men ? 50 : 47), help: "袖は袖丈×2の長さで取り、袖口側で折る" },
  ],
  build(m, p, ctx) {
    const sa = ctx.sa;
    const men = String(p.type) === "men";
    const len = Number(p.len);
    const wid = Number(p.wid);
    const sleeve = Number(p.sleeve);
    const collarLen = Math.round(m.height * 0.95);
    const pieces: Piece[] = [
      { id: "body", name: "身頃", poly: cut(wid, len * 2, sa), count: 2, note: `${wid}×${len * 2}cm の長方形(縫い代込み)を2枚。肩山で二つ折り。右前・左前それぞれ。` },
      { id: "sleeve", name: "袖", poly: cut(men ? 36 : 35, sleeve * 2, sa), count: 2, note: `${men ? 36 : 35}×${sleeve * 2}cm。長さの中央を肩側として折る。` },
      { id: "collar", name: "衿", poly: cut(11, collarLen, sa), count: 1, note: `幅11×長さ${collarLen}cm。前後の衿ぐりに続けて付ける。` },
      { id: "tie", name: "ひも", poly: cut(5, 30, sa), count: 4, note: "5×30cmの長方形。四つ折りにしてひも4本。" },
    ];
    return {
      pieces,
      extras: [
        { name: "(別途)ハーフパンツ(ゴム)", qty: "—", note: "甚平のズボンは「ボトムス > ハーフパンツ(ゴム)」で作る" },
        { name: "接着芯(薄手)", qty: "幅90cm×20cm", note: "衿・ひも付け位置に貼ると形が安定" },
      ],
      steps: [
        "水通し・地直しをして、長方形をチャコで直接布に描いて裁断。",
        "身頃の肩を折り、前の衿ぐりをカットして整える(前下がりの首元)。",
        "衿を身頃に付ける。",
        "袖を付け、脇〜袖下を縫う(脇下は少しあきを残す)。",
        "ひもを縫って身頃の前脇・内側に付ける。",
        "裾を三つ折りで始末する。",
      ],
      notes: [
        "寸法は公開されている直線裁ちの標準的な甚平(女物S〜L/男物S〜L)の寸法を参考にした目安です。",
        `衿の長さ ${collarLen}cm(女物の標準150cm / 男物160cm に対応)。`,
      ],
    };
  },
};
