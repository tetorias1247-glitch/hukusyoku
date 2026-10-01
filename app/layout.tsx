import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "服づくりプランナー | 型紙・必要布量・材料の自動計算",
  description: "作りたい服の種類とサイズを入力するだけで、型紙(製図)・必要な布の量・副資材リスト・裁断配置図・作り方を自動で作成します。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
