"use client";

import { useEffect, useMemo, useState } from "react";
import NumField from "./NumField";
import Guide from "./Guide";
import { GARMENTS, GENRES, getGarment } from "@/lib/garments";
import { FABRICS, SIZES, deriveMeasures, getFabric } from "@/lib/data";
import { costOf, estimate, type PatternMatch } from "@/lib/estimate";
import { allPiecesSvg, layoutSvg, pieceSvg, pieceTiles } from "@/lib/svg";
import { GARMENT_META, getFabricInfo, levelLabel, toolsFor } from "@/lib/meta";
import { ADJUST_DEFS, adjustKeysFor, adjustSummary } from "@/lib/adjust";
import { NO_ADJUST, type Adjust, type BuildContext, type Measures, type Params } from "@/lib/types";

type Tab = "materials" | "pattern" | "tiles" | "layout" | "steps" | "guide";

type NumKey = Exclude<keyof Measures, "men" | "kid" | "adj">;

const LIMITS: Record<NumKey, [number, number]> = {
  bust: [44, 150],
  waist: [40, 140],
  hip: [46, 160],
  height: [70, 210],
  shoulder: [18, 60],
  backLength: [17, 50],
  arm: [22, 75],
  inseam: [26, 100],
  waistToHip: [8, 26],
  crotchDepth: [14, 40],
  wrist: [9, 24],
  neck: [20, 50],
};

const BASIC: { key: "bust" | "waist" | "hip" | "height"; label: string }[] = [
  { key: "bust", label: "バスト" },
  { key: "waist", label: "ウエスト" },
  { key: "hip", label: "ヒップ" },
  { key: "height", label: "身長" },
];

const DETAIL: { key: NumKey; label: string }[] = [
  { key: "shoulder", label: "肩幅" },
  { key: "backLength", label: "背丈" },
  { key: "arm", label: "袖丈(肩先〜手首)" },
  { key: "inseam", label: "股下" },
  { key: "waistToHip", label: "腰丈(ウエスト〜ヒップ)" },
  { key: "crotchDepth", label: "股上" },
  { key: "wrist", label: "手首まわり" },
  { key: "neck", label: "首まわり" },
];

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));
const fmtM = (cm: number) => (cm / 100).toFixed(2).replace(/0$/, "");
const yen = (v: number) => `${v.toLocaleString("ja-JP")}円`;

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STORE_KEY = "garment-planner:v1";

const enc = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s))));

export default function Planner() {
  const [garmentId, setGarmentId] = useState("tshirt");
  const [sizeId, setSizeId] = useState("w9");
  const [men, setMen] = useState(false);
  const [base, setBase] = useState({ bust: 83, waist: 64, hip: 91, height: 158 });
  const [detail, setDetail] = useState<Partial<Measures>>({});
  const [ov, setOv] = useState<Record<string, number | string>>({});
  const [fabricId, setFabricId] = useState("jersey");
  const [width, setWidth] = useState(getFabric("jersey").width);
  const [pattern, setPattern] = useState<PatternMatch>("none");
  const [sa, setSa] = useState(1);
  const [hem, setHem] = useState(2.5);
  const [qty, setQty] = useState(1);
  const [toile, setToile] = useState(false);
  const [showSa, setShowSa] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [adj, setAdj] = useState<Adjust>(NO_ADJUST);
  const [tab, setTab] = useState<Tab>("materials");
  const [genre, setGenre] = useState<string>("tops");
  const [flash, setFlash] = useState("");
  const [loaded, setLoaded] = useState(false);

  const snapshot = { garmentId, sizeId, men, base, detail, ov, fabricId, width, pattern, sa, hem, qty, toile, showSa, price, done, adj, tab };

  // 前回の入力内容(または共有リンク)を復元。ブラウザの保存が使えなくても動作に影響なし
  useEffect(() => {
    try {
      let s: Record<string, any> | null = null;
      if (location.hash.startsWith("#s=")) {
        s = dec(location.hash.slice(3));
      } else {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) s = JSON.parse(raw);
      }
      if (s) {
        const g = GARMENTS.find((x) => x.id === s!.garmentId);
        if (g) {
          setGarmentId(g.id);
          setGenre(g.genre);
        }
        if (s.sizeId) setSizeId(s.sizeId);
        if (typeof s.men === "boolean") setMen(s.men);
        if (s.base) setBase((b) => ({ ...b, ...s!.base }));
        if (s.detail) setDetail(s.detail);
        if (s.ov) setOv(s.ov);
        if (s.fabricId && FABRICS.some((f) => f.id === s!.fabricId)) setFabricId(s.fabricId);
        if (typeof s.width === "number") setWidth(s.width);
        if (s.pattern) setPattern(s.pattern);
        if (typeof s.sa === "number") setSa(s.sa);
        if (typeof s.hem === "number") setHem(s.hem);
        if (typeof s.qty === "number") setQty(s.qty);
        if (typeof s.toile === "boolean") setToile(s.toile);
        if (typeof s.showSa === "boolean") setShowSa(s.showSa);
        if (typeof s.price === "number" || s.price === null) setPrice(s.price);
        if (s.done) setDone(s.done);
        if (s.adj) setAdj({ ...NO_ADJUST, ...s.adj });
        if (s.tab) setTab(s.tab);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, garmentId, sizeId, men, base, detail, ov, fabricId, width, pattern, sa, hem, qty, toile, showSa, price, done, adj, tab]);

  const say = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(""), 2000);
  };

  const garment = getGarment(garmentId);
  const fabric = getFabric(fabricId);
  const info = getFabricInfo(fabric);

  const measures: Measures = useMemo(() => {
    const merged = { ...deriveMeasures(base, men), ...detail } as Measures;
    const out = { ...merged };
    (Object.keys(LIMITS) as NumKey[]).forEach((k) => {
      out[k] = clamp(merged[k], LIMITS[k]);
    });
    return out;
  }, [base, men, detail]);

  const baseMeasures = measures;
  const params: Params = useMemo(() => {
    const p: Params = {};
    for (const d of garment.params) {
      const raw = ov[`${garment.id}:${d.key}`];
      let v: number | string = raw ?? d.def(baseMeasures);
      if (d.kind === "number") {
        v = Number(v);
        // 子ども体型では下限を緩める(小さな服になるため)
        if (d.min !== undefined) v = Math.max(baseMeasures.kid ? d.min * 0.35 : d.min, v);
        if (d.max !== undefined) v = Math.min(d.max, v);
      }
      p[d.key] = v;
    }
    return p;
  }, [garment, ov, baseMeasures]);

  // この服で有効な補正だけを製図に渡す
  const adjKeys = useMemo(() => adjustKeysFor(garment, params), [garment, params]);
  const effAdj: Adjust = useMemo(() => {
    const a = { ...NO_ADJUST };
    for (const k of adjKeys) a[k] = adj[k];
    return a;
  }, [adj, adjKeys]);
  const measuresAdj: Measures = useMemo(() => ({ ...baseMeasures, adj: effAdj }), [baseMeasures, effAdj]);
  const adjNotes = useMemo(() => adjustSummary(effAdj, adjKeys), [effAdj, adjKeys]);

  const ctx: BuildContext = useMemo(
    () => ({ fabric, sa: clamp(sa, [0.5, 3]), hem: clamp(hem, [1, 8]), width: clamp(width, [20, 300]) }),
    [fabric, sa, hem, width],
  );

  const q = Math.max(1, Math.min(50, Math.round(qty) || 1));

  const result = useMemo(() => {
    try {
      const build0 = garment.build(measuresAdj, params, ctx);
      const build = adjNotes.length ? { ...build0, notes: [`補正を反映済み → ${adjNotes.join(" / ")}`, ...build0.notes] } : build0;
      const w = clamp(width, [20, 300]);
      // 作る枚数ぶん、パーツ数を増やして必要量を計算(副資材の数量は1着分)
      const scaled = {
        ...build,
        pieces: build.pieces.map((p) => ({ ...p, count: p.count * q, interfacingCount: p.interfacingCount !== undefined ? p.interfacingCount * q : undefined })),
      };
      const est = estimate(scaled, ctx, { width: w, pattern, garmentKind: garment.suitable, toile });
      const pieceSvgs = build.pieces.map((p, i) => pieceSvg(p, ctx, { idPrefix: `pc-${p.id}`, colorIndex: i, showSa }));
      const layout = layoutSvg(est.main.packed.placements, scaled.pieces, ctx, w, est.main.packed.length);
      const tools = toolsFor(garment, fabric, build);
      const cost = costOf(est, build, { main: price ?? info.price });
      return { build, est, pieceSvgs, layout, tools, cost, w, error: null as string | null };
    } catch (e) {
      return { build: null, est: null, pieceSvgs: [], layout: "", tools: [] as string[], cost: null, w: width, error: e instanceof Error ? e.message : String(e) };
    }
  }, [garment, fabric, measuresAdj, adjNotes, params, ctx, width, pattern, q, toile, showSa, price, info.price]);

  const tiles = useMemo(() => {
    if (tab !== "tiles" || !result.build) return [];
    try {
      return result.build.pieces.map((p, i) => pieceTiles(p, ctx, i));
    } catch {
      return [];
    }
  }, [tab, result.build, ctx]);

  const pickSize = (id: string) => {
    setSizeId(id);
    const s = SIZES.find((x) => x.id === id);
    if (!s) return;
    setBase({ bust: s.bust, waist: s.waist, hip: s.hip, height: s.height });
    setMen(s.group === "men");
    setDetail({});
  };

  const pickFabric = (id: string) => {
    setFabricId(id);
    setWidth(getFabric(id).width);
    setPrice(null);
  };

  const pickGarment = (id: string) => {
    setGarmentId(id);
    const g = getGarment(id);
    setGenre(g.genre);
    // 推奨の生地があれば切り替え、種類が合わない場合は適切な既定の生地へ
    if (g.preferFabric && g.preferFabric !== fabricId) {
      pickFabric(g.preferFabric);
    } else if (fabric.width < 60 && g.genre !== "wafuku") {
      // 反物(幅38cm)は和装専用。洋服では幅の広い生地へ戻す
      pickFabric(g.suitable.includes("knit") && !g.suitable.includes("woven") ? "jersey" : "broad");
    } else if (!g.suitable.includes(fabric.kind)) {
      const f = FABRICS.find((x) => g.suitable.includes(x.kind));
      if (f) pickFabric(f.id);
    }
  };

  const setParam = (key: string, v: number | string) => setOv((o) => ({ ...o, [`${garment.id}:${key}`]: v }));

  const goTab = (t: Tab) => {
    setTab(t);
    setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const printTiles = () => {
    document.body.classList.add("print-tiles");
    const off = () => {
      document.body.classList.remove("print-tiles");
      window.removeEventListener("afterprint", off);
    };
    window.addEventListener("afterprint", off);
    window.print();
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${enc({ ...snapshot, done: {}, tab: "materials" })}`;
    try {
      await navigator.clipboard.writeText(url);
      say("共有リンクをコピーしました");
    } catch {
      window.prompt("共有リンク", url);
    }
  };

  const est = result.est;
  const build = result.build;
  const meta = GARMENT_META[garment.id];
  const totalTiles = tiles.reduce((s, p) => s + p.tiles.length, 0);

  return (
    <>
      <header className="header">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>
              服づくり<span>プランナー</span>
            </h1>
            <p>作りたい服とサイズを選ぶだけで、型紙・必要な布の量・副資材・裁断配置図・作り方をまとめて作成します。</p>
          </div>
          <button className="btn small" onClick={share}>🔗 設定を共有</button>
        </div>
        {flash && <div className="toast" role="status">{flash}</div>}
      </header>

      <div className="shell">
        <aside className="aside">
          <section className="card">
            <h2><span className="num">1</span>服の種類</h2>
            <div className="genre-tabs" role="tablist" aria-label="ジャンル">
              {GENRES.map((gn) => (
                <button key={gn.id} role="tab" aria-selected={genre === gn.id} className="gtab" onClick={() => setGenre(gn.id)}>
                  <span aria-hidden>{gn.emoji}</span> {gn.name}
                </button>
              ))}
            </div>
            <div className="garments">
              {GARMENTS.filter((g) => g.genre === genre).map((g) => (
                <button key={g.id} className="gbtn" aria-pressed={g.id === garmentId} onClick={() => pickGarment(g.id)}>
                  <span className="emoji" aria-hidden>{g.emoji}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
            <p className="gdesc">
              <strong>{garment.emoji} {garment.name}</strong>
              <span className="kind">{garment.suitable.map((k) => (k === "knit" ? "ニット向き" : "織物向き")).join("・")}</span>
              <br />
              {garment.description}
            </p>
          </section>

          <section className="card">
            <h2><span className="num">2</span>サイズ・採寸</h2>
            <div className="field full" style={{ marginBottom: 10 }}>
              <label htmlFor="size">既製服サイズから選ぶ(目安値)</label>
              <select id="size" className="plain" style={{ paddingRight: 10 }} value={sizeId} onChange={(e) => pickSize(e.target.value)}>
                <optgroup label="レディース">
                  {SIZES.filter((s) => s.group === "women").map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
                <optgroup label="キッズ(目安・成長期は個人差が大きいので実測推奨)">
                  {SIZES.filter((s) => s.group === "kids").map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
                <optgroup label="メンズ">
                  {SIZES.filter((s) => s.group === "men").map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="fields">
              {BASIC.map((b) => (
                <NumField
                  key={b.key}
                  id={`m-${b.key}`}
                  label={b.label}
                  unit="cm"
                  value={base[b.key]}
                  min={LIMITS[b.key][0]}
                  max={LIMITS[b.key][1]}
                  onChange={(v) => setBase((s) => ({ ...s, [b.key]: v }))}
                />
              ))}
            </div>
            <p className="help-link">
              <button className="linklike" onClick={() => goTab("guide")}>📏 正しい採寸のしかた</button>
              {measures.kid && <span className="kidtag">子ども体型の製図式を使用</span>}
            </p>
            <details>
              <summary>詳細な寸法(自動推定・手動で変更可)</summary>
              <div className="fields" style={{ marginTop: 10 }}>
                {DETAIL.map((d) => (
                  <NumField
                    key={d.key}
                    id={`d-${d.key}`}
                    label={d.label}
                    unit="cm"
                    value={measures[d.key]}
                    min={LIMITS[d.key][0]}
                    max={LIMITS[d.key][1]}
                    step={0.5}
                    onChange={(v) => setDetail((s) => ({ ...s, [d.key]: v }))}
                  />
                ))}
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <label style={{ fontSize: "0.8rem" }}>
                  推定基準{" "}
                  <select className="plain" style={{ width: "auto", minHeight: 32, padding: "4px 8px" }} value={men ? "m" : "w"} onChange={(e) => setMen(e.target.value === "m")}>
                    <option value="w">レディース</option>
                    <option value="m">メンズ</option>
                  </select>
                </label>
                <button className="btn small" onClick={() => setDetail({})}>自動推定に戻す</button>
              </div>
            </details>
          </section>

          <section className="card">
            <h2><span className="num">3</span>デザイン設定</h2>
            <div className="fields">
              {garment.params.map((d) =>
                d.kind === "number" ? (
                  <NumField
                    key={`${garment.id}:${d.key}`}
                    id={`p-${garment.id}-${d.key}`}
                    label={d.label}
                    unit={d.unit}
                    value={Number(params[d.key])}
                    min={measures.kid && d.min !== undefined ? d.min * 0.35 : d.min}
                    max={d.max}
                    step={d.step}
                    help={d.help}
                    full={!!d.help}
                    onChange={(v) => setParam(d.key, v)}
                  />
                ) : (
                  <div className="field full" key={`${garment.id}:${d.key}`}>
                    <label htmlFor={`p-${garment.id}-${d.key}`}>{d.label}</label>
                    <div className="input-wrap">
                      <select id={`p-${garment.id}-${d.key}`} value={String(params[d.key])} onChange={(e) => setParam(d.key, e.target.value)}>
                        {d.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn small" onClick={() => setOv((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(`${garment.id}:`))))}>
                初期値に戻す
              </button>
            </div>
          </section>

          {adjKeys.length > 0 && (
            <section className="card">
              <h2>
                <span className="num">4</span>体型補正
                {adjNotes.length > 0 && <span className="adj-badge">{adjNotes.length}件適用中</span>}
              </h2>
              <details open={adjNotes.length > 0}>
                <summary>体型に合わせて型紙を調整する</summary>
                <p className="legend" style={{ margin: "8px 0" }}>
                  既製服で「ここが合わない」と感じる部分を入力すると、型紙の線そのものが補正されます。0のままなら標準の体型です。
                </p>
                <div className="fields">
                  {ADJUST_DEFS.filter((d) => adjKeys.includes(d.key)).map((d) =>
                    d.options ? (
                      <div className="field full" key={d.key}>
                        <label htmlFor={`adj-${d.key}`}>{d.label}</label>
                        <div className="input-wrap">
                          <select id={`adj-${d.key}`} value={String(adj[d.key])} onChange={(e) => setAdj((a) => ({ ...a, [d.key]: Number(e.target.value) }))}>
                            {d.options.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <span className="help">{d.help}</span>
                      </div>
                    ) : (
                      <NumField key={d.key} id={`adj-${d.key}`} label={d.label} unit={d.unit} value={adj[d.key]} min={d.min} max={d.max} step={d.step} help={d.help} full onChange={(v) => setAdj((a) => ({ ...a, [d.key]: v }))} />
                    ),
                  )}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn small" onClick={() => setAdj(NO_ADJUST)}>補正をすべてリセット</button>
                </div>
              </details>
            </section>
          )}

          <section className="card">
            <h2><span className="num">{adjKeys.length > 0 ? 5 : 4}</span>生地・縫い代</h2>
            <div className="fields">
              <div className="field full">
                <label htmlFor="fabric">生地の種類</label>
                <div className="input-wrap">
                  <select id="fabric" value={fabricId} onChange={(e) => pickFabric(e.target.value)}>
                    {FABRICS.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}{f.kind === "knit" ? "【ニット】" : ""}</option>
                    ))}
                  </select>
                </div>
                <span className="help">{fabric.note}</span>
              </div>
              <NumField id="width" label="生地幅" unit="cm" value={width} min={20} max={300} onChange={setWidth} />
              <div className="field">
                <label htmlFor="pattern">柄合わせ</label>
                <div className="input-wrap">
                  <select id="pattern" value={pattern} onChange={(e) => setPattern(e.target.value as PatternMatch)}>
                    <option value="none">無地・小柄</option>
                    <option value="small">ストライプ・チェック(小)</option>
                    <option value="large">大柄・チェック(大)</option>
                  </select>
                </div>
              </div>
              <NumField id="sa" label="縫い代" unit="cm" value={sa} min={0.5} max={3} step={0.5} onChange={setSa} />
              <NumField id="hem" label="裾・袖口の縫い代" unit="cm" value={hem} min={1} max={8} step={0.5} onChange={setHem} />
              <NumField id="qty" label="作る枚数" unit="着" value={qty} min={1} max={50} onChange={setQty} help={q > 1 ? "生地・芯・糸は枚数ぶん。ボタン等の副資材は1着分の表示です" : undefined} full={q > 1} />
              <div className="field">
                <label htmlFor="toile">仮縫い(トワル)</label>
                <label className="check" htmlFor="toile">
                  <input id="toile" type="checkbox" checked={toile} onChange={(e) => setToile(e.target.checked)} />
                  シーチングも計算
                </label>
              </div>
            </div>
            <div className="chips" style={{ marginTop: 10 }}>
              {fabric.widths.map((w) => (
                <button key={w} className={`chip${w === width ? " on" : ""}`} style={{ cursor: "pointer" }} onClick={() => setWidth(w)}>
                  幅{w}cm
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main id="result">
          {result.error || !est || !build ? (
            <section className="card">
              <div className="warn">計算できませんでした。入力値を見直してください。({result.error})</div>
            </section>
          ) : (
            <>
              <section className="card hero">
                <div>
                  <div className="sub">{garment.emoji} {garment.name} / {fabric.name}{q > 1 ? ` / ${q}着分` : ""}</div>
                  <div className="big">
                    {fmtM(est.main.need)}m
                    <small>布幅 {result.w}cm の場合</small>
                  </div>
                  <div className="sub" style={{ marginTop: 4 }}>
                    縮み{fabric.shrink}%・予備10cm込み / 収まり効率 {Math.round(est.main.efficiency * 100)}%
                  </div>
                  {meta && (
                    <div className="chips" style={{ marginTop: 8 }}>
                      <span className="chip" title={levelLabel(meta.level)}>
                        難易度 {"★".repeat(meta.level)}{"☆".repeat(5 - meta.level)}
                      </span>
                      <span className="chip">目安 {meta.hours[0]}〜{meta.hours[1]}時間(初心者)</span>
                      {result.cost && <span className="chip">概算 約{yen(result.cost.total)}</span>}
                    </div>
                  )}
                </div>
                <div>
                  <div className="sub" style={{ marginBottom: 4 }}>布幅ごとの必要量</div>
                  <div className="chips">
                    {est.alternatives.map((a) => (
                      <span key={a.width} className={`chip${a.width === result.w ? " on" : ""}`}>
                        幅{a.width}cm → {fmtM(a.need)}m{a.oversize ? "(はぎ)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
                {est.warnings.map((w, i) => (
                  <div className="warn" key={i}>⚠ {w}</div>
                ))}
              </section>

              <div className="tabs" role="tablist">
                {(
                  [
                    ["materials", "材料・費用"],
                    ["pattern", `型紙(${build.pieces.length})`],
                    ["tiles", "A4で印刷"],
                    ["layout", "裁断配置図"],
                    ["steps", "作り方"],
                    ["guide", "ガイド"],
                  ] as [Tab, string][]
                ).map(([id, label]) => (
                  <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                    {label}
                  </button>
                ))}
              </div>

              <section className={`panel card${tab === "materials" ? " active" : ""}`}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                  <h2 style={{ margin: 0 }}>材料リスト</h2>
                  <button
                    className="btn small"
                    onClick={async () => {
                      const text = [`【${garment.name}】${fabric.name} / 幅${result.w}cm${q > 1 ? ` / ${q}着分` : ""}`, ...est.materials.map((x) => `・${x.name}: ${x.qty}${x.note ? `(${x.note})` : ""}`)].join("\n");
                      try {
                        await navigator.clipboard.writeText(text);
                        say("材料リストをコピーしました");
                      } catch {
                        window.prompt("コピーしてください", text);
                      }
                    }}
                  >
                    📋 リストをコピー
                  </button>
                </div>
                <table>
                  <thead>
                    <tr><th>材料</th><th>必要量</th></tr>
                  </thead>
                  <tbody>
                    {est.materials.map((m, i) => (
                      <tr key={i}>
                        <td>{m.name}{m.note && <span className="note">{m.note}</span>}</td>
                        <td className="qty">{m.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {result.cost && (
                  <>
                    <h2 style={{ margin: "22px 0 8px" }}>概算費用(目安)</h2>
                    <div className="fields" style={{ maxWidth: 360 }}>
                      <NumField id="price" label={`表布の単価(1mあたり)`} unit="円" value={price ?? info.price} min={0} max={100000} step={50} onChange={setPrice} />
                    </div>
                    <table style={{ marginTop: 8 }}>
                      <tbody>
                        <tr><td>表布</td><td className="qty">{yen(result.cost.main)}</td></tr>
                        {result.cost.rib > 0 && <tr><td>リブ布</td><td className="qty">{yen(result.cost.rib)}</td></tr>}
                        {result.cost.lining > 0 && <tr><td>裏地</td><td className="qty">{yen(result.cost.lining)}</td></tr>}
                        {result.cost.interfacing > 0 && <tr><td>接着芯</td><td className="qty">{yen(result.cost.interfacing)}</td></tr>}
                        <tr><td>ミシン糸</td><td className="qty">{yen(result.cost.thread)}</td></tr>
                        <tr><td>副資材(ボタン・ファスナー等の目安)</td><td className="qty">{yen(result.cost.extras)}</td></tr>
                        <tr><th style={{ color: "var(--ink)" }}>合計の目安</th><td className="qty" style={{ color: "var(--accent)" }}>{yen(result.cost.total)}</td></tr>
                      </tbody>
                    </table>
                    <p className="legend">単価は一般的な目安です。実際の価格は店舗・品質で大きく変わります(仮縫い用シーチング・道具は含みません)。</p>
                  </>
                )}

                <h2 style={{ margin: "22px 0 8px" }}>この生地の扱い方</h2>
                <table>
                  <tbody>
                    <tr><th>下準備</th><td>{info.prep}</td></tr>
                    <tr><th>ミシン針</th><td>{fabric.needle}</td></tr>
                    <tr><th>糸</th><td>{fabric.thread}</td></tr>
                    <tr><th>縫い目</th><td>{info.stitch}</td></tr>
                    <tr><th>縫い代の始末</th><td>{info.finish}</td></tr>
                    <tr><th>アイロン</th><td>{info.iron}</td></tr>
                    <tr><th>お手入れ</th><td>{info.care}</td></tr>
                  </tbody>
                </table>

                <h2 style={{ margin: "22px 0 8px" }}>必要な道具</h2>
                <div className="chips">
                  {result.tools.map((t) => (
                    <span className="chip" key={t}>{t}</span>
                  ))}
                </div>

                <h2 style={{ margin: "22px 0 8px" }}>パーツ一覧(裁断枚数)</h2>
                <table>
                  <thead>
                    <tr><th>パーツ</th><th>枚数</th><th>備考</th></tr>
                  </thead>
                  <tbody>
                    {build.pieces.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="qty">{p.count * q}枚{p.onFold ? "(わ)" : ""}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                          {p.fabric === "rib" ? "リブ布 / " : p.fabric === "lining" ? "裏地 / " : ""}{p.interfacing ? "接着芯あり / " : ""}縫い代 {p.sa ?? ctx.sa}cm{p.hemExtra ? `・裾 ${ctx.hem}cm` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className={`panel card${tab === "pattern" ? " active" : ""}`}>
                <h2>型紙(製図)</h2>
                <div className="row" style={{ marginBottom: 12 }}>
                  <button className="btn primary" onClick={() => download(`${garment.id}-pattern.svg`, allPiecesSvg(build.pieces, ctx), "image/svg+xml")}>
                    ⬇ 全パーツを実寸SVGで保存
                  </button>
                  <button className="btn" onClick={() => goTab("tiles")}>🖨 家庭用プリンタ(A4)で印刷</button>
                  <label className="check">
                    <input type="checkbox" checked={showSa} onChange={(e) => setShowSa(e.target.checked)} />
                    縫い代線を表示
                  </label>
                </div>
                <p className="legend" style={{ margin: "0 0 12px" }}>
                  実線=仕上がり線 / 点線=縫い代線(外側) / 青矢印=布目(たて地) / ピンク=わ・ダーツ・合い印。保存したSVGは1cm=1cmの実寸なので、印刷店やプロッターで100%出力できます。
                </p>
                <div className="pieces">
                  {build.pieces.map((p, i) => (
                    <article className="piece" key={p.id}>
                      <h3>{p.name}</h3>
                      <p className="meta">
                        {p.count}枚{p.onFold ? "・わ裁ち" : ""}{p.fabric === "rib" ? "・リブ布" : p.fabric === "lining" ? "・裏地" : ""}{p.interfacing ? "・接着芯" : ""}
                      </p>
                      <div className="svgbox" dangerouslySetInnerHTML={{ __html: result.pieceSvgs[i] }} />
                      {p.note && <p className="meta" style={{ marginTop: 6 }}>{p.note}</p>}
                    </article>
                  ))}
                </div>
              </section>

              <section className={`panel card tiles-panel${tab === "tiles" ? " active" : ""}`}>
                <h2>A4で原寸印刷(家庭用プリンタ)</h2>
                {tab === "tiles" && (
                  <>
                    <ol className="steps noprint">
                      <li>「印刷」を押し、<strong>用紙A4・縦・倍率100%(「ページに合わせる」はオフ)・余白は標準または8mm程度</strong>で印刷します。</li>
                      <li>1ページ目の<strong>5cm角の四角</strong>を定規で測り、5cmになっているか必ず確認してください。</li>
                      <li>各パーツの「列・行」の番号順に、<strong>のりしろ(1.5cm)を重ねて</strong>トンボ(＋印)を合わせて貼り合わせます。</li>
                    </ol>
                    <div className="row noprint" style={{ margin: "10px 0" }}>
                      <button className="btn primary" onClick={printTiles}>🖨 印刷({totalTiles + 1}ページ)</button>
                      <span className="legend" style={{ margin: 0 }}>パーツ別の枚数: {tiles.map((t) => `${t.name} ${t.cols}×${t.rows}`).join(" / ")}</span>
                    </div>
                    <div className="tilepage tile">
                      <div className="calib" aria-label="5cm角の確認用の四角">
                        <div className="calib-box" />
                        <p>この四角が <strong>5cm × 5cm</strong> なら原寸です。</p>
                      </div>
                      <p className="meta">{garment.name} / {fabric.name}</p>
                      <ul className="notes">
                        {tiles.map((t) => (
                          <li key={t.pieceId}>{t.name}: {t.cols}列 × {t.rows}行 = {t.tiles.length}枚(左上から右へ、行ごとに貼り合わせ)</li>
                        ))}
                      </ul>
                    </div>
                    {tiles.map((t) =>
                      t.tiles.map((tl) => (
                        <div className="tile" key={`${t.pieceId}-${tl.col}-${tl.row}`} dangerouslySetInnerHTML={{ __html: tl.svg }} />
                      )),
                    )}
                  </>
                )}
              </section>

              <section className={`panel card layout${tab === "layout" ? " active" : ""}`}>
                <h2>裁断配置図(布幅 {result.w}cm・1枚置き{q > 1 ? `・${q}着分` : ""})</h2>
                <div dangerouslySetInnerHTML={{ __html: result.layout }} />
                <p className="legend">
                  縦方向が布目(たて地)です。各パーツは縫い代込みの外形で長方形に近似して詰めています(「わ」のパーツは開いた状態で配置)。
                  実際には型をうまく噛み合わせるとこの配置図より短くできる場合があります。柄物は柄の位置も考えて余裕を見てください。
                </p>
              </section>

              <section className={`panel card${tab === "steps" ? " active" : ""}`}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>作り方の流れ</h2>
                  <button className="btn small" onClick={() => setDone((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith(`${garment.id}:`))))}>チェックをリセット</button>
                </div>
                <ol className="steps checklist">
                  {build.steps.map((s, i) => {
                    const k = `${garment.id}:${i}`;
                    return (
                      <li key={i} className={done[k] ? "done" : ""}>
                        <label>
                          <input type="checkbox" checked={!!done[k]} onChange={(e) => setDone((d) => ({ ...d, [k]: e.target.checked }))} />
                          <span>{s}</span>
                        </label>
                      </li>
                    );
                  })}
                </ol>
                <h2 style={{ margin: "20px 0 8px" }}>メモ</h2>
                <ul className="notes">
                  {build.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                  <li>型紙はヌードサイズ+ゆとりから自動計算した簡易ドラフトです。本縫いの前に、安い布やシーチングで仮縫い(トワル)をして調整するのがおすすめです。</li>
                </ul>
              </section>

              <section className={`panel card${tab === "guide" ? " active" : ""}`}>
                <h2>服づくりガイド</h2>
                <Guide />
              </section>
            </>
          )}
        </main>
      </div>

      <div className="mbar">
        <button className="btn small" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>⚙ 設定</button>
        <span className="mbar-need">
          {est ? `${fmtM(est.main.need)}m(幅${result.w}cm)` : "—"}
        </span>
        <button className="btn small primary" onClick={() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" })}>結果 ↓</button>
      </div>

      <footer className="foot">
        サイズの目安は日本の既製服サイズ(JIS L 4005 等)を参考にした値で、メーカーにより異なります。キッズサイズは成長期の個人差が大きい目安です。型紙は文化式原型の考え方を参考にした簡易製図であり、体型・好みに合わせた調整を前提としています。必要布量・概算費用は目安です。
      </footer>
    </>
  );
}
