import type { BuildContext, Piece, Pt } from "./types";
import { bbox, mirrorFull, offsetPolygon, round1 } from "./geometry";
import type { Placement } from "./estimate";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pts = (a: Pt[]) => a.map(([x, y]) => `${round1(x * 10) / 10},${round1(y * 10) / 10}`).join(" ");

const COLORS = ["#fde2e4", "#e2ece9", "#dfe7fd", "#fff1e6", "#f0efeb", "#e8e0f5", "#d6eaf8", "#fcf6bd"];
export const colorFor = (i: number) => COLORS[i % COLORS.length];

interface PieceSvgOpts {
  idPrefix: string;
  /** true: 実寸(cm単位)で出力。false: 画面に合わせて拡縮 */
  actual?: boolean;
  colorIndex?: number;
  /** 縫い代線を描く(既定 true) */
  showSa?: boolean;
}

interface Parts {
  defs: string;
  body: string;
  minX: number;
  minY: number;
  vw: number;
  vh: number;
}

/** 1パーツ分の描画要素(<svg>の中身)と描画領域 */
function pieceParts(p: Piece, ctx: BuildContext, o: PieceSvgOpts): Parts {
  const sa = p.sa ?? ctx.sa;
  const fold = !!p.onFold;
  const showSa = o.showSa !== false;
  const base = fold ? mirrorFull(p.poly) : p.poly;
  const off = offsetPolygon(base, sa);
  const bbF = bbox(p.poly);
  const bbO = bbox(off);
  const big = Math.max(bbF.w, bbF.h, 20);
  const sw = Math.max(0.07, big / 320);
  const fs = Math.max(1.5, big / 24);
  const minX = fold ? -1.5 : bbO.minX - 1.5;
  const maxX = bbO.maxX + 1.5;
  const minY = bbO.minY - 1.5;
  const maxY = bbO.maxY + 1.5 + fs * 2.4;
  const vw = maxX - minX;
  const vh = maxY - minY;
  const clip = `${o.idPrefix}-clip`;

  const out: string[] = [];
  let defs = "";
  if (fold && showSa) defs = `<defs><clipPath id="${clip}"><rect x="0" y="${minY - 5}" width="${vw + 10}" height="${vh + 10}"/></clipPath></defs>`;
  if (showSa) {
    out.push(`<polygon points="${pts(off)}" fill="none" stroke="#8a8a8a" stroke-width="${sw}" stroke-dasharray="${sw * 5} ${sw * 3}" ${fold ? `clip-path="url(#${clip})"` : ""}/>`);
  }
  const fill = colorFor(o.colorIndex ?? 0);
  if (fold) {
    out.push(`<polygon points="${pts(p.poly)}" fill="${fill}" fill-opacity="0.55" stroke="none"/>`);
    out.push(`<polyline points="${pts(p.poly)}" fill="none" stroke="#1f2937" stroke-width="${sw * 1.6}" stroke-linejoin="round"/>`);
    const f0 = p.poly[0];
    const f1 = p.poly[p.poly.length - 1];
    out.push(`<line x1="0" y1="${f0[1]}" x2="0" y2="${f1[1]}" stroke="#d6336c" stroke-width="${sw * 1.4}" stroke-dasharray="${sw * 6} ${sw * 2} ${sw * 1.5} ${sw * 2}"/>`);
    const fy = (f0[1] + f1[1]) / 2;
    out.push(`<text x="${fs * 0.5}" y="${fy}" font-size="${fs}" fill="#d6336c">わ</text>`);
  } else {
    out.push(`<polygon points="${pts(p.poly)}" fill="${fill}" fill-opacity="0.55" stroke="#1f2937" stroke-width="${sw * 1.6}" stroke-linejoin="round"/>`);
  }
  for (const m of p.marks ?? []) {
    out.push(`<polyline points="${pts(m)}" fill="none" stroke="#c2255c" stroke-width="${sw * 1.2}" stroke-dasharray="${sw * 3} ${sw * 2}"/>`);
  }
  // 合い印(袖山の中心)
  if (/sleeve/.test(p.id)) {
    const nx = bbF.minX + bbF.w / 2;
    const ny = bbF.minY;
    const nl = Math.max(0.8, fs * 0.55);
    out.push(`<polygon points="${nx - nl * 0.5},${ny - nl * 1.1} ${nx + nl * 0.5},${ny - nl * 1.1} ${nx},${ny}" fill="#c2255c"/>`);
    out.push(`<text x="${nx + nl}" y="${ny - nl * 0.2}" font-size="${fs * 0.7}" fill="#c2255c">袖山(肩線に合わせる)</text>`);
  }
  // 布目線
  const gx = fold ? bbF.w * 0.55 : bbF.minX + bbF.w * 0.5;
  const gy0 = bbF.minY + bbF.h * 0.22;
  const gy1 = bbF.minY + bbF.h * 0.78;
  const ah = Math.max(1, fs * 0.6);
  out.push(`<g stroke="#1971c2" fill="#1971c2" stroke-width="${sw * 1.2}">`);
  out.push(`<line x1="${gx}" y1="${gy0}" x2="${gx}" y2="${gy1}"/>`);
  out.push(`<polygon points="${gx},${gy0 - ah * 0.2} ${gx - ah * 0.45},${gy0 + ah} ${gx + ah * 0.45},${gy0 + ah}" stroke="none"/>`);
  out.push(`<polygon points="${gx},${gy1 + ah * 0.2} ${gx - ah * 0.45},${gy1 - ah} ${gx + ah * 0.45},${gy1 - ah}" stroke="none"/>`);
  out.push(`</g>`);
  out.push(`<text x="${gx + ah * 0.7}" y="${(gy0 + gy1) / 2}" font-size="${fs * 0.8}" fill="#1971c2">布目</text>`);
  const wTxt = fold ? round1(bbF.w * 2) : round1(bbF.w);
  const label = `${esc(p.name)}  ${wTxt}×${round1(bbF.h)}cm${fold ? "(わ展開時)" : ""}  ×${p.count}枚`;
  out.push(`<text x="${minX + 0.5}" y="${maxY - fs * 0.6}" font-size="${fs}" fill="#374151">${label}</text>`);
  return { defs, body: out.join(""), minX, minY, vw, vh };
}

/** 1パーツの型紙SVG(仕上がり線・縫い代線・布目・わ・ダーツ・寸法)を返す */
export function pieceSvg(p: Piece, ctx: BuildContext, o: PieceSvgOpts): string {
  const q = pieceParts(p, ctx, o);
  const size = o.actual ? `width="${round1(q.vw * 100) / 100}cm" height="${round1(q.vh * 100) / 100}cm"` : `width="100%"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="${q.minX} ${q.minY} ${q.vw} ${q.vh}" font-family="sans-serif">${q.defs}${q.body}</svg>`;
}

export interface Tile {
  svg: string;
  col: number;
  row: number;
}

export interface PieceTiles {
  pieceId: string;
  name: string;
  cols: number;
  rows: number;
  tiles: Tile[];
}

/** A4(縦)1枚に収まるサイズに分割(のりしろ1.5cm)。用紙の余白は印刷設定で8mm前提。 */
const TILE_W = 19;
const TILE_H = 27.5;
const OVERLAP = 1.5;

export function pieceTiles(p: Piece, ctx: BuildContext, colorIndex: number): PieceTiles {
  const q = pieceParts(p, ctx, { idPrefix: `t-${p.id}`, colorIndex });
  const stepX = TILE_W - OVERLAP;
  const stepY = TILE_H - OVERLAP;
  const cols = Math.max(1, Math.ceil((q.vw - OVERLAP) / stepX));
  const rows = Math.max(1, Math.ceil((q.vh - OVERLAP) / stepY));
  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = q.minX + c * stepX;
      const y = q.minY + r * stepY;
      const m: string[] = [];
      // のりしろ(貼り合わせ位置の目印)と四隅のトンボ、ページ番号
      const mark = (cx: number, cy: number) => `<path d="M${cx - 0.6},${cy} H${cx + 0.6} M${cx},${cy - 0.6} V${cy + 0.6}" stroke="#444" stroke-width="0.06"/>`;
      m.push(mark(x + OVERLAP, y + OVERLAP), mark(x + TILE_W - OVERLAP, y + OVERLAP), mark(x + OVERLAP, y + TILE_H - OVERLAP), mark(x + TILE_W - OVERLAP, y + TILE_H - OVERLAP));
      m.push(`<rect x="${x + 0.03}" y="${y + 0.03}" width="${TILE_W - 0.06}" height="${TILE_H - 0.06}" fill="none" stroke="#bbb" stroke-width="0.04" stroke-dasharray="0.3 0.3"/>`);
      m.push(`<rect x="${x + OVERLAP}" y="${y + OVERLAP}" width="${TILE_W - OVERLAP * 2}" height="${TILE_H - OVERLAP * 2}" fill="none" stroke="#e0a0b4" stroke-width="0.04" stroke-dasharray="0.2 0.2"/>`);
      m.push(`<text x="${x + 0.4}" y="${y + 0.9}" font-size="0.7" fill="#c2255c" font-family="sans-serif">${esc(p.name)}  列${c + 1}/${cols}・行${r + 1}/${rows}</text>`);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}cm" height="${TILE_H}cm" viewBox="${x} ${y} ${TILE_W} ${TILE_H}" font-family="sans-serif">${q.defs}${q.body}${m.join("")}</svg>`;
      tiles.push({ svg, col: c + 1, row: r + 1 });
    }
  }
  return { pieceId: p.id, name: p.name, cols, rows, tiles };
}
/** 全パーツを並べた実寸SVG(ダウンロード用・原寸印刷用) */
export function allPiecesSvg(pieces: Piece[], ctx: BuildContext): string {
  const rowMax = 180;
  const gap = 4;
  let x = 0;
  let y = 0;
  let rowH = 0;
  const parts: string[] = [];
  let totalW = 0;
  pieces.forEach((p, i) => {
    const inner = pieceSvg(p, ctx, { idPrefix: `d${i}`, colorIndex: i, actual: false });
    // 外枠サイズを取り出す
    const m = /viewBox="([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)"/.exec(inner);
    if (!m) return;
    const vw = parseFloat(m[3]);
    const vh = parseFloat(m[4]);
    if (x > 0 && x + vw > rowMax) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    const body = inner.replace(/<svg [^>]*>/, `<svg x="${x}" y="${y}" width="${vw}" height="${vh}" viewBox="${m[1]} ${m[2]} ${m[3]} ${m[4]}" overflow="visible">`);
    parts.push(body);
    x += vw + gap;
    rowH = Math.max(rowH, vh);
    totalW = Math.max(totalW, x - gap);
  });
  const totalH = y + rowH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${round1(totalW)}cm" height="${round1(totalH)}cm" viewBox="0 0 ${totalW} ${totalH}" font-family="sans-serif">${parts.join("")}</svg>`;
}

/** 裁断配置図SVG(布幅 × 使用長) */
export function layoutSvg(placements: Placement[], pieces: Piece[], ctx: BuildContext, fabricWidth: number, length: number): string {
  const byId = new Map<string, { p: Piece; i: number }>();
  pieces.forEach((p, i) => byId.set(p.id, { p, i }));
  const fs = Math.max(1.8, fabricWidth / 55);
  const top = fs * 2.6;
  const left = fs * 3.2;
  const vw = fabricWidth + left + 2;
  const vh = length + top + 2;
  const sw = Math.max(0.12, fabricWidth / 600);
  const o: string[] = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${vw} ${vh}" font-family="sans-serif">`);
  o.push(`<rect x="${left}" y="${top}" width="${fabricWidth}" height="${length}" fill="#fbfaf7" stroke="#6b7280" stroke-width="${sw}"/>`);
  o.push(`<line x1="${left + 1}" y1="${top}" x2="${left + 1}" y2="${top + length}" stroke="#adb5bd" stroke-width="${sw}" stroke-dasharray="${sw * 4} ${sw * 3}"/>`);
  o.push(`<line x1="${left + fabricWidth - 1}" y1="${top}" x2="${left + fabricWidth - 1}" y2="${top + length}" stroke="#adb5bd" stroke-width="${sw}" stroke-dasharray="${sw * 4} ${sw * 3}"/>`);
  o.push(`<text x="${left + fabricWidth / 2}" y="${top - fs * 0.8}" font-size="${fs}" text-anchor="middle" fill="#374151">布幅 ${fabricWidth}cm(耳〜耳)</text>`);
  o.push(`<text x="${left - fs * 0.5}" y="${top + length / 2}" font-size="${fs}" text-anchor="middle" fill="#374151" transform="rotate(-90 ${left - fs * 0.5} ${top + length / 2})">配置長 ${Math.ceil(length)}cm(縦=布目)</text>`);
  placements.forEach((pl) => {
    const e = byId.get(pl.pieceId);
    const px = left + pl.x;
    const py = top + pl.y;
    if (!e || pl.split) {
      o.push(`<rect x="${px}" y="${py}" width="${pl.w}" height="${pl.h}" fill="#ffe3e3" stroke="#e03131" stroke-width="${sw}" stroke-dasharray="${sw * 4} ${sw * 2}"/>`);
      o.push(`<text x="${px + pl.w / 2}" y="${py + pl.h / 2}" font-size="${fs * 0.8}" text-anchor="middle" fill="#c92a2a">${esc(pl.label)}</text>`);
      return;
    }
    const { p, i } = e;
    const sa = p.sa ?? ctx.sa;
    const full = p.onFold ? mirrorFull(p.poly) : p.poly;
    const bb = bbox(full);
    const t = full.map(([x, y]): Pt => [(pl.mirrored && !p.onFold ? bb.maxX - x : x - bb.minX) + px + sa, y - bb.minY + py + sa]);
    const offp = offsetPolygon(t, sa);
    o.push(`<polygon points="${pts(offp)}" fill="none" stroke="#868e96" stroke-width="${sw}" stroke-dasharray="${sw * 4} ${sw * 2.5}"/>`);
    o.push(`<polygon points="${pts(t)}" fill="${colorFor(i)}" fill-opacity="0.85" stroke="#1f2937" stroke-width="${sw * 1.3}" stroke-linejoin="round"/>`);
    // 布目矢印
    const cx = px + sa + bb.w / 2;
    const gy0 = py + sa + bb.h * 0.3;
    const gy1 = py + sa + bb.h * 0.7;
    o.push(`<line x1="${cx}" y1="${gy0}" x2="${cx}" y2="${gy1}" stroke="#1971c2" stroke-width="${sw}"/>`);
    o.push(`<polygon points="${cx},${gy0 - 0.5} ${cx - 0.9},${gy0 + 1.4} ${cx + 0.9},${gy0 + 1.4}" fill="#1971c2"/>`);
    o.push(`<polygon points="${cx},${gy1 + 0.5} ${cx - 0.9},${gy1 - 1.4} ${cx + 0.9},${gy1 - 1.4}" fill="#1971c2"/>`);
    if (bb.w > fs * 4 && bb.h > fs * 3) {
      o.push(`<text x="${cx + 1.2}" y="${(gy0 + gy1) / 2}" font-size="${fs * 0.75}" fill="#1f2937">${esc(p.name)}</text>`);
    }
  });
  o.push(`</svg>`);
  return o.join("");
}
