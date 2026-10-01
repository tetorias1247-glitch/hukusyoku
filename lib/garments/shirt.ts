import type { GarmentDef, Piece, Pt } from "../types";
import { normalize, round1 } from "../geometry";
import { bodice, rect, sleeve } from "./common";

export const shirt: GarmentDef = {
  id: "shirt",
  genre: "tops",
  name: "シャツ・ブラウス",
  emoji: "👔",
  description: "前あきのシャツ。台襟付きシャツカラー・カフス(長袖時)・前立て見返し付き。",
  suitable: ["woven"],
  params: [
    { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 8, max: 30, step: 1, def: () => 14, help: "シャツは12〜16、オーバーサイズは20〜" },
    { key: "length", label: "着丈(肩から)", unit: "cm", kind: "number", min: 45, max: 100, step: 1, def: (m) => Math.round(m.height * 0.43) },
    { key: "sleeve", label: "袖丈(肩先から)", unit: "cm", kind: "number", min: 5, max: 70, step: 1, def: (m) => m.arm, help: "40cm以上なら長袖(カフス付き)、未満は半袖" },
    { key: "pocket", label: "胸ポケット", kind: "select", options: [{ value: "yes", label: "あり" }, { value: "no", label: "なし" }], def: () => "no" },
  ],
  build(m, p, ctx) {
    const ease = Number(p.ease);
    const length = Number(p.length);
    const sleeveLen = Number(p.sleeve);
    const longSleeve = sleeveLen >= 40;
    const ext = 4.5; // 持ち出し1.5 + 見返し3.0
    const b = bodice(m, { ease, length, frontExt: ext, shoulderAdd: 0.5 });
    const hemX = ctx.hem - ctx.sa;

    const front = normalize(b.front({ fold: false }));
    const back = normalize(b.back({ fold: true }));
    const capH = b.armholeLen / 4 + 1.5;
    const cuffFinished = 5;
    const cuffLen = m.wrist + 5; // 手首まわり + ゆとり5cm
    const probe = sleeve(b.armholeLen, capH, sleeveLen, 20, 1.5, m.adj?.arm ?? 0);
    const bicep = probe.halfWidth * 2;
    const hemW = longSleeve ? cuffLen + 4 : bicep - 3;
    const cutLen = longSleeve ? sleeveLen - cuffFinished : sleeveLen;
    const sl = sleeve(b.armholeLen, capH, cutLen, Math.min(hemW, bicep - 2), 1.5, m.adj?.arm ?? 0);
    const slv = normalize(sl.poly);

    const neck = b.neckCircumference;
    const standLen = neck + 1.5;
    const collar: Pt[] = [[0, 0], [standLen - 0, 0], [standLen - 3, 7], [3, 7]];

    const pieces: Piece[] = [
      {
        id: "front",
        name: "前身頃",
        poly: front.poly,
        count: 2,
        hemExtra: hemX,
        interfacing: true,
        interfacingRect: [ext + ctx.sa * 2, length + ctx.sa],
        interfacingCount: 2,
        note: "左右対称に2枚(1枚は型紙を裏返す)。左端の4.5cmは持ち出し1.5+見返し3.0。見返し部分に接着芯。",
      },
      { id: "back", name: "後ろ身頃", poly: back.poly, count: 1, onFold: true, hemExtra: hemX, note: "中心(左)を「わ」に置く。背中心にタックを入れる場合は左右+3cm。" },
      { id: "sleeve", name: longSleeve ? "袖(長袖)" : "袖(半袖)", poly: slv.poly, count: 2, hemExtra: longSleeve ? 0 : hemX, note: longSleeve ? "袖口のあき(約8cm)を袖下側に作り、ギャザーかタックでカフスに合わせる。" : "袖口は三つ折りで始末。" },
      { id: "stand", name: "台襟", poly: rect(standLen, 3.5 * 2 - 0), count: 2, interfacing: true, interfacingCount: 1, note: "表と裏の2枚。表側に接着芯。完成幅3.0cm程度。" },
      { id: "collar", name: "上襟", poly: collar, count: 2, interfacing: true, interfacingCount: 1, note: "表と裏の2枚。表側に接着芯。" },
    ];
    if (longSleeve) {
      pieces.push({ id: "cuff", name: "カフス", poly: rect(cuffLen + 2.5, cuffFinished * 2), count: 2, interfacing: true, interfacingCount: 2, note: "二つ折りにして袖口に付ける。長さ=手首+ゆとり5cm+持ち出し2.5cm。" });
      pieces.push({ id: "placket", name: "袖あきの帯布", poly: rect(3.5, 17), count: 2, note: "袖口のあき用。幅3.5cm。" });
    }
    if (String(p.pocket) === "yes") {
      pieces.push({ id: "pocket", name: "胸ポケット", poly: rect(11, 12.5), count: 1, interfacing: true, note: "仕上がり 10×11cm(上端3cm三つ折り)。左胸に付ける。" });
    }

    const nFront = Math.floor((length - 2) / 9) + 1;
    const nButtons = nFront + 1 + (longSleeve ? 4 : 0) + 1;
    return {
      pieces,
      extras: [
        { name: "ボタン(11〜13mm)", qty: `約 ${nButtons} 個`, note: `前 ${nFront}・台襟1${longSleeve ? "・カフス2・袖あき2" : ""}・予備1` },
        { name: "ボタンホール用糸 / 手縫い糸", qty: "1", note: "ミシンのボタンホール機能を使う場合は通常の糸で可" },
      ],
      steps: [
        "水通し・地直し後、アイロンで布目を整え、接着芯を貼る(襟・台襟・カフス・前立て)。",
        "前身頃の見返しを折り(端を1cm内折り→3cmに折る)、前立てを仕上げる。",
        "後ろ身頃と前身頃の肩を縫う。",
        "襟を縫って表に返し、台襟に挟んで衿ぐりに付ける。",
        "袖を付け(いせ込み)、脇〜袖下を続けて縫う。",
        longSleeve ? "袖口にあきを作り、ギャザー(タック)を寄せてカフスを付ける。" : "袖口を三つ折りで始末する。",
        "裾を三つ折りで縫い、ボタンホールとボタンを付ける。",
      ],
      notes: [
        `衿ぐり全周 ${round1(neck)}cm(台襟長さ=${round1(standLen)}cm) / 袖ぐり ${round1(b.armholeLen)}cm / 上腕幅 ${round1(bicep)}cm`,
        "前身頃は持ち出し込みで描いてあります(前中心線がx=0、そこから左へ4.5cm)。",
      ],
    };
  },
};

