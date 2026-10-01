import type { GarmentDef, Piece } from "../types";
import { normalize, round1 } from "../geometry";
import { bodice, rect, sleeve } from "./common";

export const jacket: GarmentDef = {
  id: "jacket",
  genre: "outer",
  preferFabric: "wool",
  name: "ジャケット(ノーカラー)",
  emoji: "🥼",
  description: "衿なしの裏地付きジャケット。前見返し付き、袖は1枚袖。丈とゆとりを変えるとコートにもなります。",
  suitable: ["woven"],
  params: [
    { key: "length", label: "着丈(肩から)", unit: "cm", kind: "number", min: 45, max: 130, step: 1, def: (m) => Math.round(m.height * 0.37), help: "ジャケット≒身長×0.37 / コート≒身長×0.6〜0.7" },
    { key: "ease", label: "バストのゆとり", unit: "cm", kind: "number", min: 12, max: 45, step: 1, def: () => 22, help: "ジャケット18〜24 / コート26〜34(中にニットを着る分)" },
    { key: "sleeve", label: "袖丈(肩先から)", unit: "cm", kind: "number", min: 30, max: 75, step: 1, def: (m) => m.arm + 1 },
    { key: "flare", label: "裾の広がり(1/4あたり)", unit: "cm", kind: "number", min: 0, max: 15, step: 1, def: () => 0, help: "Aラインのコートは3〜6" },
    { key: "buttons", label: "ボタンの数", kind: "number", min: 1, max: 9, step: 1, def: (m) => Math.max(2, Math.round((m.height * 0.37) / 20)) },
  ],
  build(m, p, ctx) {
    const length = Number(p.length);
    const sleeveLen = Number(p.sleeve);
    const ext = 3; // 持ち出し(前端の重なり)
    const nwb = m.kid ? m.bust / 20 + 2.5 : m.bust / 24 + 3.4;
    const b = bodice(m, { ease: Number(p.ease), length, neckAdd: 0.5, frontNeckDepth: nwb + 2, shoulderAdd: 1, flare: Number(p.flare), frontExt: ext });
    const front = normalize(b.front({ fold: false })).poly;
    const back = normalize(b.back({ fold: true })).poly;
    const capH = b.armholeLen / 4 + 2.5;
    const probe = sleeve(b.armholeLen, capH, sleeveLen, 20, 2.5, m.adj?.arm ?? 0);
    const bicep = probe.halfWidth * 2;
    const hemW = Math.max(m.wrist + 8, bicep * 0.62);
    const sl = sleeve(b.armholeLen, capH, sleeveLen, hemW, 2.5, m.adj?.arm ?? 0);
    const slp = normalize(sl.poly).poly;
    const hemX = ctx.hem - ctx.sa + 1;
    const nBtn = Number(p.buttons);

    const pieces: Piece[] = [
      { id: "front", name: "前身頃(表)", poly: front, count: 2, interfacing: true, hemExtra: hemX, note: "左右対称に2枚。前端の持ち出し3cm。全面に接着芯。" },
      { id: "back", name: "後ろ身頃(表)", poly: back, count: 1, onFold: true, hemExtra: hemX, note: "背中心「わ」。背中心を縫い合わせる場合は縫い代を足して2枚取り。" },
      { id: "sleeve", name: "袖(表)", poly: slp, count: 2, hemExtra: hemX, interfacing: true, interfacingRect: [hemW + 2, 10], interfacingCount: 2, note: "袖口の裏に接着芯を貼る(幅約8cm)。" },
      { id: "facing", name: "前見返し", poly: rect(8, length + 3), count: 2, interfacing: true, note: "前端の裏に付ける表地の見返し。全面に接着芯。" },
      { id: "nfacing", name: "後ろ衿ぐり見返し", poly: rect(round1(2 * b.backNeckLen + 6), 9), count: 1, interfacing: true, note: "後ろ衿ぐりの裏に付ける見返し。" },
      { id: "lfront", name: "前身頃(裏)", poly: front, count: 2, fabric: "lining", hemExtra: 1, note: "裏地。見返しの分だけ小さくして付ける。" },
      { id: "lback", name: "後ろ身頃(裏)", poly: back, count: 1, onFold: true, fabric: "lining", hemExtra: 1, note: "背中心にゆとり(1cmのタック)を入れる。" },
      { id: "lsleeve", name: "袖(裏)", poly: slp, count: 2, fabric: "lining", hemExtra: 1 },
    ];
    const btnSize = length > 80 ? "25mm" : "20mm";
    return {
      pieces,
      extras: [
        { name: `ボタン(${btnSize})`, qty: `${nBtn}個`, note: "前中心に等間隔(シングル打ち合わせ)" },
        { name: "肩パッド(薄手)", qty: "1組", note: "任意。形を整えたいとき" },
        { name: "伸び止めテープ(織物用・1cm幅)", qty: "約 3m", note: "肩・衿ぐり・前端に使用" },
      ],
      steps: [
        "表布を地直しし、接着芯を貼って裁断。裏地を同じ型で裁断。",
        "表身頃の肩・脇を縫い、前見返しと後ろ衿ぐり見返しを付ける。",
        "袖を作って(袖下を縫う)身頃にいせ込んで付ける。",
        "裏地も同様に縫い、表の衿ぐり・前端・裾と中表に合わせて縫う。",
        "袖口の表と裏を縫い合わせ、返し口から表に返す。",
        "返し口をまつり、アイロンで整えてボタンホール・ボタンを付ける。",
      ],
      notes: [
        `袖ぐり ${round1(b.armholeLen)}cm / 上腕幅 ${round1(bicep)}cm / 袖山 ${round1(capH)}cm`,
        "ジャケット・コートは仮縫い(トワル)をしてから本裁ちすることを強くおすすめします。",
      ],
    };
  },
};
