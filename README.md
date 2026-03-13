# ミニマムタックス M&A シミュレーター

2026年度税制改正（ミニマムタックス強化）がM&Aの手取りに与える影響をシミュレーションするWebアプリ。

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# テスト実行（計算ロジックの検証）
npm run test

# 本番ビルド
npm run build
```

## プロジェクト構成

```
CLAUDE.md                  ← Claude Code用のプロジェクトコンテキスト
src/
├── App.tsx                ← メインアプリ（Phase 1プロトタイプ）
├── lib/
│   ├── taxEngine.ts       ← 計算エンジン（検証済み）
│   └── taxEngine.test.ts  ← テストケース
└── styles/
    └── index.css          ← Tailwind + カスタムCSS
docs/
├── requirements.md        ← 要件定義書 v1.1
├── verify_calc.py         ← Python検証スクリプト
└── verification_output.txt ← 検証結果
```

## Claude Codeでの開発

`CLAUDE.md` にプロジェクトの全コンテキスト（計算ロジック、テストケース、デザイン方針）が記載されています。
Claude Codeは自動的にこのファイルを参照します。

### 推奨タスク例

```bash
# コンポーネント分割
claude "App.tsxを個別コンポーネントに分割して。InputPanel, ComparisonView, SplitSaleView, EffectiveRateChart, SensitivityTableに分けて"

# TypeScript化
claude "App.tsxの@ts-nocheckを外して、全体を正しいTypeScriptに変換して"

# テスト実行
claude "npm run testを実行して、全テストケースがpassすることを確認して"

# UIブラッシュアップ
claude "チャートのツールチップを日本語にして、数値のフォーマットを改善して"
```

## ライセンス

Private
