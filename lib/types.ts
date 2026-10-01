export type Pt = [number, number];

/** 1枚の型紙パーツ。座標はcm、左上原点。縫い代を含まない仕上がり線。 */
export interface Piece {
  id: string;
  name: string;
  /** 仕上がり線の外形(閉じた多角形)。onFold の場合は「わ」(x=0) から右側の半身 */
  poly: Pt[];
  /** 裁断枚数(表布) */
  count: number;
  onFold?: boolean;
  /** 縫い代とは別に、下側へ足す裾の追加分(cm) */
  hemExtra?: number;
  /** 接着芯を貼る */
  interfacing?: boolean;
  /** 接着芯の枚数(省略時は裁断枚数) */
  interfacingCount?: number;
  /** 接着芯を部分的に貼る場合の芯の寸法 [幅,高さ](縫い代込み) */
  interfacingRect?: [number, number];
  /** 使用する布: 表布 / リブ布(ニット) */
  fabric?: "main" | "rib" | "lining";
  note?: string;
  /** ダーツ・あき止まりなどの補助線 */
  marks?: Pt[][];
  /** 縫い代幅の上書き */
  sa?: number;
}

/** 体型に合わせた補正量(cm)。0=補正なし */
export interface Adjust {
  slope: number; // 肩の傾斜: +なで肩 / −いかり肩
  bustBalance: number; // 前身頃の幅を広く(+)/後ろを広く(−)
  frontLen: number; // 前丈の補正(胸が豊か・反り身 など)
  backLen: number; // 後ろ丈の補正(猫背 など)
  arm: number; // 上腕まわりの補正(+太い)
  neck: number; // 首まわり(衿ぐり幅)の補正
  seat: number; // 出尻(+)/平尻(−)
  tummy: number; // お腹まわり(+出ている)
  thigh: number; // 太ももまわり(+太い)
}

export const NO_ADJUST: Adjust = { slope: 0, bustBalance: 0, frontLen: 0, backLen: 0, arm: 0, neck: 0, seat: 0, tummy: 0, thigh: 0 };

export interface Measures {
  bust: number; // バスト
  waist: number; // ウエスト
  hip: number; // ヒップ
  height: number; // 身長
  shoulder: number; // 肩幅
  backLength: number; // 背丈
  arm: number; // 袖丈(肩先から手首)
  inseam: number; // 股下
  waistToHip: number; // 腰丈
  crotchDepth: number; // 股上(ウエスト〜股)
  wrist: number; // 手首まわり
  neck: number; // 首まわり
  men?: boolean; // メンズ体型の推定基準
  kid?: boolean; // 子ども体型(身長150cm未満)
  adj?: Adjust; // 補正
}

export interface ParamDef {
  key: string;
  label: string;
  unit?: string;
  kind: "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  help?: string;
  /** 採寸値から算出される初期値 */
  def: (m: Measures) => number | string;
}

export type Params = Record<string, number | string>;

export type FabricKind = "woven" | "knit";

export interface FabricPreset {
  id: string;
  name: string;
  kind: FabricKind;
  width: number; // cm
  widths: number[]; // 一般的な生地幅
  shrink: number; // 水通し縮み見込み(%)
  needle: string;
  thread: string;
  note: string;
}

export interface MaterialItem {
  name: string;
  qty: string;
  note?: string;
}

export interface BuildContext {
  fabric: FabricPreset;
  sa: number; // 縫い代
  width: number; // 実際に使う生地幅(cm)
  hem: number; // 裾縫い代
}

export interface BuildResult {
  pieces: Piece[];
  extras: MaterialItem[];
  steps: string[];
  notes: string[];
}

export type GenreId = "tops" | "pants" | "skirts" | "dress" | "outer" | "wafuku" | "other";

export interface GarmentDef {
  genre: GenreId;
  /** 選択時に自動で切り替える推奨の生地ID */
  preferFabric?: string;
  id: string;
  name: string;
  emoji: string;
  description: string;
  suitable: FabricKind[];
  params: ParamDef[];
  build: (m: Measures, p: Params, ctx: BuildContext) => BuildResult;
}

