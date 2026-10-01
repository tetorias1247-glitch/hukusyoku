import type { GarmentDef, Piece } from "../types";
import { normalize, round1 } from "../geometry";
import { bodice, rect, sleeve } from "./common";

export const tshirt: GarmentDef = {
  id: "tshirt",
  genre: "tops",
  preferFabric: "jersey",
  name: "Tシャツ",
  emoji: "👕",
  description: "ニット生地で作る基本のTシャツ。前後身頃・袖・リブ衿の5パーツ。",
  suitable: ["knit"],
  params: [
    { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 4, max: 30, step: 1, def: () => 12, help: "ニットは8〜12、ゆったりなら16〜" },
    { key: "length", label: "着丈(肩から)", unit: "cm", kind: "number", min: 40, max: 100, step: 1, def: (m) => Math.round(m.height * 0.42) },
    { key: "sleeve", label: "袖丈(肩先から)", unit: "cm", kind: "number", min: 5, max: 70, step: 1, def: () => 20, help: "半袖20前後 / 長袖は袖丈" },
    { key: "neckDepth", label: "前衿ぐりの深さ", unit: "cm", kind: "number", min: 4, max: 14, step: 0.5, def: (m) => (m.kid ? 6.5 : 9) },
  ],
  build(m, p, ctx) {
    const ease = Number(p.ease);
    const length = Number(p.length);
    const sleeveLen = Number(p.sleeve);
    const b = bodice(m, { ease, length, neckAdd: 1, frontNeckDepth: Number(p.neckDepth), shoulderAdd: 1 });
    const hemX = ctx.hem - ctx.sa;

    const front = normalize(b.front());
    const back = normalize(b.back());
    const capH = b.armholeDepth * 0.5 + 0.5;
    const probe = sleeve(b.armholeLen, capH, sleeveLen, 20, 0.5, m.adj?.arm ?? 0);
    const bicep = probe.halfWidth * 2;
    const hemW = sleeveLen > 35 ? Math.max(m.wrist * 1.4 + 6, bicep * 0.62) : bicep - 3;
    const sl = sleeve(b.armholeLen, capH, sleeveLen, hemW, 0.5, m.adj?.arm ?? 0);
    const slv = normalize(sl.poly);

    const neckLen = round1(b.neckCircumference * 0.85);
    const band = rect(neckLen, 4);

    const pieces: Piece[] = [
      { id: "front", name: "前身頃", poly: front.poly, count: 1, onFold: true, hemExtra: hemX, note: "中心(左)を「わ」に置いて裁つ。" },
      { id: "back", name: "後ろ身頃", poly: back.poly, count: 1, onFold: true, hemExtra: hemX, note: "中心(左)を「わ」に置いて裁つ。後ろ衿ぐりは前より浅い。" },
      { id: "sleeve", name: "袖", poly: slv.poly, count: 2, hemExtra: hemX, note: "袖山の中心に合い印。袖山寸法は袖ぐり+ゆとりに合わせて自動計算。" },
      { id: "band", name: "衿リブ", poly: band, count: 1, fabric: "rib", note: `縦方向に伸びる向きで裁つ。衿ぐり全周 ${round1(b.neckCircumference)}cm の約85%(${neckLen}cm)で輪にして付ける。`, sa: 0.8 },
    ];

    return {
      pieces,
      extras: [
        { name: "ニット用伸び止めテープ(1cm幅)", qty: "約 30cm", note: "肩線(左右各12〜14cm)に貼って伸びを防ぐ" },
        { name: "(任意)ツイン針/ニット用裾テープ", qty: "1", note: "裾・袖口の伸び止めと始末用" },
      ],
      steps: [
        "水通し・地直しをして、生地の縦(ウェール)を確認する。",
        "型紙に縫い代を付けて裁断。前後身頃は「わ」で、袖は左右対称に2枚。",
        "肩を縫い合わせる(伸び止めテープを挟む)。",
        "衿リブを輪に縫い、半分に折って衿ぐりに4等分の印を合わせ、引き伸ばしながら付ける。",
        "袖を身頃に付ける(フラットに付ける方法)。",
        "脇と袖下を続けて縫い、裾と袖口を二つ折りにして伸縮ステッチで押さえる。",
      ],
      notes: [
        `袖ぐり寸法 ${round1(b.armholeLen)}cm / 衿ぐり全周 ${round1(b.neckCircumference)}cm / 袖幅(上腕) ${round1(bicep)}cm`,
        "伸縮性の少ない生地では、バストのゆとりを +4〜6cm 足してください。",
      ],
    };
  },
};
