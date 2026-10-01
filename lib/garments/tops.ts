import type { GarmentDef, Piece, Pt } from "../types";
import { normalize, quad, round1 } from "../geometry";
import { bodice, rect, sleeve } from "./common";

const nwBase = (bust: number, kid?: boolean) => (kid ? bust / 20 + 2.5 : bust / 24 + 3.4);

export const tank: GarmentDef = {
  id: "tank",
  genre: "tops",
  preferFabric: "jersey",
  name: "タンクトップ",
  emoji: "🎽",
  description: "袖なしのトップス。衿ぐり・袖ぐりを細いバインダー(縁取り)で始末します。ニットでも織物でも可。",
  suitable: ["knit", "woven"],
  params: [
    { key: "length", label: "着丈(肩から)", unit: "cm", kind: "number", min: 35, max: 90, step: 1, def: (m) => Math.round(m.height * 0.4) },
    { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 2, max: 24, step: 1, def: () => 8, help: "ニットは4〜8、織物は10以上" },
    { key: "strap", label: "肩ひも幅", unit: "cm", kind: "number", min: 3, max: 12, step: 0.5, def: () => 5.5 },
    { key: "neckDepth", label: "前衿ぐりの深さ", unit: "cm", kind: "number", min: 5, max: 20, step: 0.5, def: (m) => (m.kid ? 8 : 11) },
  ],
  build(m, p, ctx) {
    const neckAdd = 1.5;
    const nw = nwBase(m.bust, m.kid) + neckAdd;
    const shoulderAdd = nw + Number(p.strap) - m.shoulder / 2;
    const b = bodice(m, { ease: Number(p.ease), length: Number(p.length), neckAdd, frontNeckDepth: Number(p.neckDepth), shoulderAdd });
    const hemX = ctx.hem - ctx.sa;
    const knit = ctx.fabric.kind === "knit";
    const k = knit ? 0.9 : 1.0;
    const pieces: Piece[] = [
      { id: "front", name: "前身頃", poly: normalize(b.front()).poly, count: 1, onFold: true, hemExtra: hemX, note: "中心(左)を「わ」に置く。" },
      { id: "back", name: "後ろ身頃", poly: normalize(b.back()).poly, count: 1, onFold: true, hemExtra: hemX },
      { id: "neckbind", name: "衿ぐりバインダー", poly: rect(round1(b.neckCircumference * k), 3.5), count: 1, fabric: "rib", sa: 0.5, note: knit ? "ニットは伸びる向きで、衿ぐり全周の90%に伸ばして付ける。" : "織物はバイアス(斜め45°)に裁つ。" },
      { id: "armbind", name: "袖ぐりバインダー", poly: rect(round1(b.armholeLen * k), 3.5), count: 2, fabric: "rib", sa: 0.5, note: "袖ぐり全周に合わせて付ける。" },
    ];
    return {
      pieces,
      extras: [],
      steps: [
        "水通し・地直しをして裁断(前後身頃は「わ」)。",
        "肩を縫い合わせる(ニットは伸び止めテープを挟む)。",
        "衿ぐり・袖ぐりにバインダーを付けて縁取りする。",
        "脇を縫い、裾を二つ折りで始末する。",
      ],
      notes: [`衿ぐり全周 ${round1(b.neckCircumference)}cm / 袖ぐり ${round1(b.armholeLen)}cm / 肩ひも幅 ${p.strap}cm`],
    };
  },
};

interface SweatOpts {
  id: string;
  name: string;
  emoji: string;
  hood: boolean;
}

function makeSweat(o: SweatOpts): GarmentDef {
  return {
    id: o.id,
    genre: "tops",
    preferFabric: "sweat",
    name: o.name,
    emoji: o.emoji,
    description: o.hood
      ? "フード付きのスウェット。前身頃のカンガルーポケット、袖口・裾はリブ。"
      : "ドロップショルダーのスウェット(トレーナー)。衿・袖口・裾はリブ。",
    suitable: ["knit"],
    params: [
      { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 10, max: 40, step: 1, def: () => 24, help: "スウェットは20〜28が標準" },
      { key: "length", label: "着丈(肩から・リブ含む)", unit: "cm", kind: "number", min: 40, max: 90, step: 1, def: (m) => Math.round(m.height * 0.4) },
      { key: "sleeve", label: "袖丈(肩先から・リブ含む)", unit: "cm", kind: "number", min: 30, max: 75, step: 1, def: (m) => m.arm },
      { key: "rib", label: "リブの完成幅(裾・袖口)", unit: "cm", kind: "number", min: 4, max: 10, step: 0.5, def: () => 6 },
      ...(o.hood ? [{ key: "pocket", label: "カンガルーポケット", kind: "select" as const, options: [{ value: "yes", label: "あり" }, { value: "no", label: "なし" }], def: () => "yes" }] : []),
    ],
    build(m, p, ctx) {
      const rib = Number(p.rib);
      const length = Number(p.length) - rib;
      const sleeveLen = Number(p.sleeve) - rib;
      const nwb = nwBase(m.bust, m.kid);
      const b = bodice(m, {
        ease: Number(p.ease),
        length,
        neckAdd: o.hood ? 3 : 1.5,
        frontNeckDepth: o.hood ? nwb + 1 : nwb + 2.5,
        shoulderAdd: 3,
      });
      const capH = b.armholeDepth * 0.45;
      const probe = sleeve(b.armholeLen, capH, sleeveLen, 20, 0, m.adj?.arm ?? 0);
      const bicep = probe.halfWidth * 2;
      const hemW = Math.min(m.wrist + 10, bicep - 4);
      const sl = sleeve(b.armholeLen, capH, sleeveLen, hemW, 0, m.adj?.arm ?? 0);
      const bodyHem = b.hemQuarter * 4;
      const pieces: Piece[] = [
        { id: "front", name: "前身頃", poly: normalize(b.front()).poly, count: 1, onFold: true, note: "中心(左)を「わ」に置く。" },
        { id: "back", name: "後ろ身頃", poly: normalize(b.back()).poly, count: 1, onFold: true },
        { id: "sleeve", name: "袖", poly: normalize(sl.poly).poly, count: 2, note: "袖口にリブを付けるため縫い代のみ。" },
        { id: "cuff", name: "袖口リブ", poly: rect(round1(hemW * 0.8), rib * 2), count: 2, fabric: "rib", note: "リブの伸びる向きを横に。輪にして袖口に付ける(袖口寸法の約80%)。" },
        { id: "hemrib", name: "裾リブ", poly: rect(round1(bodyHem * 0.85), rib * 2), count: 1, fabric: "rib", note: "裾回りの約85%の長さ。輪にして裾に付ける。" },
        { id: "neckrib", name: "衿リブ", poly: rect(round1(b.neckCircumference * (o.hood ? 0.9 : 0.8)), 8), count: 1, fabric: "rib", note: o.hood ? "フードの衿ぐりに付けるテープ状のリブ(省略可)。" : "衿ぐり全周の約80%。完成幅3cm。" },
      ];
      const extras = [] as { name: string; qty: string; note?: string }[];
      if (o.hood) {
        const N = b.frontNeckLen + b.backNeckLen;
        const hood: Pt[] = [
          [0, 0],
          [0, 30],
          [N, 33],
          ...quad([N, 33], [N + 5, 26], [N + 7, 15], 8).slice(1),
          ...quad([N + 7, 15], [N + 6, -3], [0, 0], 12).slice(1),
        ];
        pieces.push({ id: "hood", name: "フード", poly: normalize(hood).poly, count: 4, note: "左右の2枚を中心で縫い、外側と内側(同じ布)の2組を作る。顔まわりに紐通しの折り代を。" });
        if (String(p.pocket) === "yes") {
          pieces.push({ id: "pocket", name: "カンガルーポケット", poly: normalize([[0, 0], [38, 0], [33, 20], [5, 20]]).poly, count: 1, note: "前身頃の裾リブ上に付ける。両脇の斜め口はステッチで補強。" });
        }
        extras.push({ name: "ひも(丸ひも・平ひも)", qty: "約 120cm", note: "フードの紐通し用" }, { name: "ハトメ(8mm)", qty: "2組", note: "フード前に紐を出す" });
      }
      return {
        pieces,
        extras,
        steps: [
          "水通し・地直し。ニットは布端を切りそろえて、縦(ウェール)方向を確認する。",
          "肩を縫う(伸び止めテープを挟む)。",
          o.hood ? "フードを縫って、衿ぐりにまち針で付ける。" : "衿リブを輪にして衿ぐりに付ける。",
          "袖を付け、脇〜袖下を続けて縫う。",
          "袖口・裾にリブを輪にして付ける。",
          "ミシンは伸縮ステッチ(ロックミシン推奨)。",
        ],
        notes: [`袖ぐり ${round1(b.armholeLen)}cm / 上腕幅 ${round1(bicep)}cm / 裾回り(リブ付ける前) ${round1(bodyHem)}cm`],
      };
    },
  };
}

export const sweat = makeSweat({ id: "sweat", name: "スウェット(トレーナー)", emoji: "🧥", hood: false });
export const hoodie = makeSweat({ id: "hoodie", name: "パーカー(フード付き)", emoji: "🧢", hood: true });

export const cardigan: GarmentDef = {
  id: "cardigan",
  genre: "tops",
  preferFabric: "ponte",
  name: "カーディガン",
  emoji: "🧶",
  description: "前あきのニットカーディガン。前立てと衿を続けた1本のリブ帯で始末します。",
  suitable: ["knit"],
  params: [
    { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 8, max: 40, step: 1, def: () => 16 },
    { key: "length", label: "着丈(肩から)", unit: "cm", kind: "number", min: 40, max: 120, step: 1, def: (m) => Math.round(m.height * 0.42) },
    { key: "sleeve", label: "袖丈(肩先から)", unit: "cm", kind: "number", min: 30, max: 75, step: 1, def: (m) => m.arm },
    { key: "band", label: "前立ての完成幅", unit: "cm", kind: "number", min: 2, max: 8, step: 0.5, def: () => 3.5 },
    { key: "buttons", label: "ボタンの数", kind: "number", min: 0, max: 12, step: 1, def: (m) => Math.max(3, Math.round(m.height * 0.42 / 10)), help: "0=オープン(前を開けて着る)" },
  ],
  build(m, p, ctx) {
    const length = Number(p.length);
    const sleeveLen = Number(p.sleeve);
    const band = Number(p.band);
    const cuffH = 5;
    const nwb = nwBase(m.bust, m.kid);
    const b = bodice(m, { ease: Number(p.ease), length, neckAdd: 0.5, frontNeckDepth: nwb + 1.5, shoulderAdd: 1.5 });
    const capH = b.armholeDepth * 0.5;
    const probe = sleeve(b.armholeLen, capH, sleeveLen - cuffH, 20, 0.5, m.adj?.arm ?? 0);
    const bicep = probe.halfWidth * 2;
    const hemW = Math.min(m.wrist + 7, bicep - 4);
    const sl = sleeve(b.armholeLen, capH, sleeveLen - cuffH, hemW, 0.5, m.adj?.arm ?? 0);
    const hemX = ctx.hem - ctx.sa;
    const bandLen = round1((2 * length + b.neckCircumference) * 0.92);
    const n = Number(p.buttons);
    return {
      pieces: [
        { id: "front", name: "前身頃", poly: normalize(b.front({ fold: false })).poly, count: 2, hemExtra: hemX, note: "左右対称に2枚。前中心(左端)にリブ帯を付ける。" },
        { id: "back", name: "後ろ身頃", poly: normalize(b.back()).poly, count: 1, onFold: true, hemExtra: hemX },
        { id: "sleeve", name: "袖", poly: normalize(sl.poly).poly, count: 2 },
        { id: "cuff", name: "袖口リブ", poly: rect(round1(hemW * 0.8), cuffH * 2), count: 2, fabric: "rib", note: "輪にして袖口に付ける。" },
        { id: "band", name: "前立て・衿リブ帯", poly: rect(bandLen, band * 2 + 1), count: 1, fabric: "rib", note: "前端〜衿ぐり〜前端まで続けて付ける1本の帯。長さは約92%に伸ばして付ける。" },
      ],
      extras: [
        ...(n > 0 ? [{ name: "ボタン(15mm)", qty: `${n}個`, note: "ボタンホールは前立てリブに(ニット用の芯を裏に貼ると安定)" }] : []),
        { name: "ニット用伸び止めテープ(1cm幅)", qty: "約 30cm", note: "肩線用" },
      ],
      steps: [
        "水通し・地直し。ニットは裁断前に布目を整える。",
        "肩を縫う(伸び止めテープ)。",
        "前立て・衿のリブ帯を前端と衿ぐりに続けて付ける。",
        "袖を付け、脇〜袖下を続けて縫う。",
        "袖口リブと裾を始末し、ボタンホール・ボタンを付ける。",
      ],
      notes: [`リブ帯の長さ ${bandLen}cm(前端2辺+衿ぐり全周の約92%)`],
    };
  },
};

export const vest: GarmentDef = {
  id: "vest",
  genre: "tops",
  preferFabric: "wool",
  name: "ベスト(ジレ)",
  emoji: "🦺",
  description: "裏地付きの前あきベスト。深めのV寄り衿ぐり。表布+裏布を縫い合わせて返す「袋縫い」仕立て。",
  suitable: ["woven"],
  params: [
    { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 6, max: 30, step: 1, def: () => 14 },
    { key: "length", label: "着丈(肩から)", unit: "cm", kind: "number", min: 40, max: 100, step: 1, def: (m) => Math.round(m.height * 0.4) },
    { key: "neckDepth", label: "前衿ぐりの深さ", unit: "cm", kind: "number", min: 5, max: 30, step: 0.5, def: (m) => (m.kid ? 11 : 18) },
    { key: "buttons", label: "ボタンの数", kind: "number", min: 2, max: 9, step: 1, def: () => 5 },
  ],
  build(m, p, ctx) {
    const length = Number(p.length);
    const b = bodice(m, { ease: Number(p.ease), length, neckAdd: 0, frontNeckDepth: Number(p.neckDepth), shoulderAdd: -2, frontExt: 2 });
    const front = normalize(b.front({ fold: false })).poly;
    const back = normalize(b.back({ fold: true })).poly;
    const hemX = ctx.hem - ctx.sa;
    return {
      pieces: [
        { id: "front", name: "前身頃(表)", poly: front, count: 2, interfacing: true, hemExtra: hemX, note: "左右対称に2枚。左端2cmは持ち出し。全面に接着芯。" },
        { id: "back", name: "後ろ身頃(表)", poly: back, count: 1, onFold: true, hemExtra: hemX },
        { id: "lfront", name: "前身頃(裏)", poly: front, count: 2, fabric: "lining", hemExtra: 1, note: "裏地。表と同じ形。" },
        { id: "lback", name: "後ろ身頃(裏)", poly: back, count: 1, onFold: true, fabric: "lining", hemExtra: 1 },
      ],
      extras: [{ name: "ボタン(15〜18mm)", qty: `${Number(p.buttons)}個`, note: "前中心に等間隔" }],
      steps: [
        "表布に接着芯を貼って裁断。裏地も同じ型で裁断。",
        "表・裏それぞれ肩を縫う。",
        "表と裏を中表に合わせ、衿ぐり・前端・袖ぐり・裾を縫う(脇は残す)。",
        "肩から表に返し、脇を引き出して縫い合わせる。",
        "全体にアイロンを当て、ボタンホールとボタンを付ける。",
      ],
      notes: [`前端の持ち出しは2cm。袖ぐり寸法 ${round1(b.armholeLen)}cm`],
    };
  },
};
