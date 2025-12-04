# 病院ダッシュボードシステム

電子カルテ・医事コンピュータからのデータを可視化するダッシュボードシステムです。

## 🏥 システム概要

### アーキテクチャ

```
[電子カルテDB] ──┐
                   ├──> [ETL] ──> [DashboardDB (SQLite)]
[医事コンDB] ───┘                      │
                                       ↓
                              [GraphQL Yoga Server]
                                       ↓
                           [Webブラウザ (Apollo Client + Chart.js)]
```

### 主な機能

- **外来データ**: 診療科別患者数、初診/再診の推移
- **入院データ**: 病棟別入院患者数、病床稼働率
- **算定種データ**: 各種加算の件数推移
- **前年比較**: 1年前のデータと容易に比較可能
- **柔軟な集計**: 日次/月次での表示切替
- **3x3グリッド**: 9つのグラフエリアで多角的に分析

## 📋 必要要件

- **OS**: Windows 10（インターネット接続不要）
- **Node.js**: v18以上
- **ブラウザ**: Microsoft Edge または Google Chrome

## 🚀 セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. データベース初期化

```bash
# データベースとマスタデータを作成
npm run init-db
```

### 3. サンプルデータ生成

```bash
# 2年分のサンプルデータを生成
npm run seed-data
```

## 🎯 起動方法

### サーバーとクライアントを同時起動

```bash
npm run dev
```

### 個別起動

```bash
# GraphQLサーバー起動（ポート4000）
npm run server

# 静的ファイルサーバー起動（ポート3000）
npm run client
```

## 🌐 アクセス

- **クライアント**: http://localhost:3000
- **GraphQL Playground**: http://localhost:4000/graphql

## 📊 使用方法

### 初期表示

1. ブラウザで http://localhost:3000 にアクセス
2. 「初期設定を読込」ボタンをクリック
3. YAML設定ファイルに基づいて9つのグラフが自動描画されます

### グラフの変更

1. 変更したいグラフエリアをクリック（青い枠で選択状態になります）
2. 左側メニューで設定を変更：
   - **表示種別**: 外来/入院/算定種
   - **診療科/病棟**: 全数、全科積上、または個別選択
   - **初診・再診**: 両方/初診のみ/再診のみ
   - **集計期間**: 日次/月次
   - **期間選択**: 開始日と終了日
   - **前年比較表示**: チェックを入れると昨年のデータを点線で表示
3. 「選択グラフを更新」ボタンをクリック

### メニューの制御

- **外来選択時**: 診療科、初診・再診が選択可能
- **入院選択時**: 診療科、病棟が選択可能
- **算定種選択時**: 算定内容のみ選択可能

## 📂 プロジェクト構造

```
webapp/
├── server/
│   ├── index.js              # GraphQL Yogaサーバー
│   └── static-server.js      # 静的ファイル配信サーバー
├── client/
│   └── public/
│       ├── index.html        # メインHTML
│       ├── style.css         # スタイルシート
│       └── app.js            # クライアントロジック
├── database/
│   ├── schema.sql            # データベーススキーマ
│   ├── init-db.js            # DB初期化スクリプト
│   ├── seed-data.js          # サンプルデータ生成
│   └── dashboard.db          # SQLiteデータベース（自動生成）
├── config/
│   └── dashboard-config.yaml # 初期グラフ設定
└── package.json
```

## 🗄️ データベーススキーマ

### マスタテーブル

- **ka_master**: 診療科マスタ
- **ward_master**: 病棟マスタ

### データテーブル

- **outpatient_daily**: 外来データ（日次）
- **inpatient_daily**: 入院データ（日次）
- **billing_daily**: 算定種データ（日次）

## ⚙️ 設定ファイル

`config/dashboard-config.yaml` で初期表示するグラフを設定できます。

```yaml
graphs:
  - position: 0          # グラフ位置（0-8）
    type: outpatient     # 種別: outpatient/inpatient/billing
    ka_code: null        # null=全科積上
    view_type: stacked   # stacked/individual
    time_range: monthly  # daily/monthly
```

## 🔌 GraphQL API

### 主要なクエリ

```graphql
# 診療科マスタ取得
query {
  validKaMasters {
    kaCode
    kaName
  }
}

# 外来データ取得
query {
  outpatientData(
    dateRange: { startDate: "2024-01-01", endDate: "2024-03-31" }
    kaCode: 1
    aggregation: "daily"
  ) {
    date
    firstVisitCount
    revisitCount
  }
}

# 前年比較データ取得
query {
  outpatientComparison(
    dateRange: { startDate: "2024-01-01", endDate: "2024-03-31" }
    kaCode: 1
    aggregation: "monthly"
  ) {
    date
    totalCount
  }
}
```

## 🔧 技術スタック

### サーバーサイド
- **GraphQL Yoga 5**: GraphQLサーバー
- **better-sqlite3**: SQLiteデータベース
- **Node.js**: ランタイム環境

### クライアントサイド
- **Apollo Client 3**: GraphQLクライアント
- **Chart.js 4**: グラフ描画ライブラリ
- **js-yaml**: YAML設定ファイル解析

## 📝 カスタマイズ

### 新しい診療科を追加

```sql
INSERT INTO ka_master (ka_name, ka_code, seq, valid)
VALUES ('循環器内科', 9, 9, 1);
```

### 新しい病棟を追加

```sql
INSERT INTO ward_master (ward_name, ward_code, seq, bed_count, valid)
VALUES ('5病棟', 105, 6, 40, 1);
```

### 新しい算定種を追加

データテーブルに直接挿入すれば自動的に選択肢に表示されます。

```sql
INSERT INTO billing_daily (date, billing_type, count)
VALUES ('2024-12-04', '新しい加算', 10);
```

## 🚧 将来の拡張予定

- [ ] ETL機能の実装（電子カルテ/医事コンからのデータ取り込み）
- [ ] Google Cloud Functions への移行
- [ ] ユーザー認証機能
- [ ] レポート出力機能（PDF/Excel）
- [ ] リアルタイムデータ更新（WebSocket）
- [ ] ダッシュボードレイアウトの保存機能

## 🐛 トラブルシューティング

### グラフが表示されない

1. ブラウザの開発者ツールでエラーを確認
2. GraphQLサーバーが起動しているか確認（http://localhost:4000/graphql）
3. データベースにデータが存在するか確認

### データベースエラー

```bash
# データベースを再初期化
npm run init-db
npm run seed-data
```

### ポートが使用中

`server/index.js` と `server/static-server.js` のポート番号を変更してください。

## 📄 ライセンス

MIT License

## 👥 サポート

質問や問題が発生した場合は、プロジェクトのIssueセクションに報告してください。
