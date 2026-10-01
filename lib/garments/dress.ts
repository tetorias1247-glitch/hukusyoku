import type { GarmentDef, Piece } from "../types";
import { normalize, round1 } from "../geometry";
import { bodice, sleeve } from "./common";

export const dress: GarmentDef = {
  id: "dress",
  genre: "dress",
  name: "ワンピース(ノースリーブ)",
  emoji: "💃",
  description: "ウエストを軽く絞ったAラインのワンピース。後ろ中心ファスナー、ノースリーブ/袖付きを選べます。",
  suitable: ["woven"],
  params: [
    { key: "length", label: "着丈(肩から)", unit: "cm", kind: "number", min: 60, max: 150, step: 1, def: (m) => Math.round(m.height * 0.62), help: "膝丈≒身長×0.6 / ロング≒身長×0.8" },
    { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 4, max: 30, step: 1, def: () => 10 },
    { key: "waistEase", label: "ウエストのゆとり", unit: "cm", kind: "number", min: 4, max: 30, step: 1, def: () => 12 },
    { key: "hipEase", label: "ヒップのゆとり", unit: "cm", kind: "number", min: 4, max: 30, step: 1, def: () => 10 },
    { key: "flare", label: "裾の広がり(1/4あたり)", unit: "cm", kind: "number", min: 0, max: 30, step: 1, def: () => 8, help: "大きいほどフレアが強く、布も多く必要" },
    { key: "sleeve", label: "袖丈(0=ノースリーブ)", unit: "cm", kind: "number", min: 0, max: 60, step: 1, def: () => 0 },
  ],
  build(m, p, ctx) {
    const length = Number(p.length);
    const sleeveLen = Number(p.sleeve);
    const b = bodice(m, {
      ease: Number(p.ease),
      length,
      waistEase: Number(p.waistEase),
      hipEase: Number(p.hipEase),
      flare: Number(p.flare),
      neckAdd: 0.5,
      shoulderAdd: sleeveLen > 0 ? 0 : -1,
    });
    const hemX = ctx.hem - ctx.sa;
    const front = normalize(b.front({ fold: true }));
    const back = normalize(b.back({ fold: false }));

    const pieces: Piece[] = [
      { id: "front", name: "前身頃・スカート", poly: front.poly, count: 1, onFold: true, hemExtra: hemX, note: "前中心(左)を「わ」に置く。ウエスト位置の合い印を忘れずに。" },
      { id: "back", name: "後ろ身頃・スカート", poly: back.poly, count: 2, hemExtra: hemX, note: "左右2枚。後ろ中心(左辺)でコンシールファスナーを付けるあき(衿ぐりからヒップ下まで)。" },
    ];
    let bias = b.neckCircumference + 8;
    if (sleeveLen > 0) {
      const capH = b.armholeLen / 4 + 1.5;
      const probe = sleeve(b.armholeLen, capH, sleeveLen, 20, 1.5, m.adj?.arm ?? 0);
      const bicep = probe.halfWidth * 2;
      const sl = sleeve(b.armholeLen, capH, sleeveLen, bicep - (sleeveLen < 30 ? 3 : 6), 1.5, m.adj?.arm ?? 0);
      pieces.push({ id: "sleeve", name: "袖", poly: normalize(sl.poly).poly, count: 2, hemExtra: hemX, note: "袖山の合い印を肩線に合わせ、いせ込んで付ける。" });
    } else {
      bias += 2 * (b.armholeLen + 4);
    }
    const zip = Math.ceil((m.backLength + m.waistToHip - 2) / 5) * 5;
    return {
      pieces,
      extras: [
        { name: "コンシールファスナー", qty: `${zip}cm 1本`, note: "後ろ中心(衿ぐり下〜ヒップ付近)" },
        { name: "バイアステープ(両折れ12mm幅)", qty: `約 ${Math.ceil((bias + 10) / 10) * 10}cm`, note: sleeveLen > 0 ? "衿ぐり始末用" : "衿ぐり・袖ぐり始末用(共布で作ってもよい)" },
        { name: "スカートホック(後ろ衿ぐり留め)", qty: "1組" },
      ],
      steps: [
        "水通し・地直し。前は「わ」、後ろは左右2枚で裁断。",
        "後ろ中心をあき止まりまで縫い、コンシールファスナーを付ける。",
        "肩を縫い、衿ぐりをバイアステープで始末する。",
        sleeveLen > 0 ? "袖を付け、脇〜袖下を続けて縫う。" : "袖ぐりをバイアステープで始末してから脇を縫う。",
        "ハンガーで1日つるして落ち着かせ、裾を三つ折りで始末する。",
      ],
      notes: [
        `ウエスト位置は 後ろ衿ぐり中心から約 ${round1(m.backLength)}cm / 裾回り 約 ${round1(b.hemQuarter * 4)}cm / 袖ぐり ${round1(b.armholeLen)}cm`,
        sleeveLen > 0 ? "" : "ノースリーブは肩幅を1cm詰めて作っています。気になる場合は試着して調整してください。",
      ].filter(Boolean),
    };
  },
};
