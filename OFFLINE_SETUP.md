# オフライン環境セットアップガイド

このガイドでは、**インターネット接続がないWindows 10環境**で病院ダッシュボードシステムをセットアップする手順を説明します。

## 📋 前提条件

### オンライン環境（初回準備用）
- インターネット接続が可能なPC
- Git（リポジトリのクローン用）

### オフライン環境（実際の運用環境）
- **OS**: Windows 10
- **Node.js**: v18以上がインストール済み
- **ブラウザ**: Microsoft Edge または Google Chrome

## 🚀 セットアップ手順

### ステップ1: オンライン環境での準備

インターネットに接続できるPCで以下を実行：

#### 1-1. リポジトリのクローン

```bash
git clone https://github.com/hiro1966/SimpleDashboard.git
cd SimpleDashboard
```

#### 1-2. 依存パッケージのインストール

```bash
npm install
```

このコマンドで以下が自動実行されます：
- すべての依存パッケージのダウンロード
- `node_modules`ディレクトリの作成
- Chart.jsとjs-yamlのローカルコピー（`client/public/libs/`）

#### 1-3. プロジェクト全体を圧縮

```bash
# Windowsの場合：SimpleDashboardフォルダを右クリック → 「送る」 → 「圧縮(zip形式)フォルダー」

# またはコマンドラインで
tar -czf SimpleDashboard.tar.gz SimpleDashboard/
```

**重要**: `node_modules`ディレクトリと`client/public/libs`ディレクトリが含まれていることを確認してください。

### ステップ2: オフライン環境への転送

圧縮したファイルをUSBメモリ等で**オフライン環境のWindows 10 PC**に転送します。

### ステップ3: オフライン環境でのセットアップ

#### 3-1. ファイルの展開

```bash
# 転送した圧縮ファイルを展開
# SimpleDashboard.zipを右クリック → 「すべて展開」

# 展開後、ディレクトリに移動
cd SimpleDashboard
```

#### 3-2. データベースの初期化

```bash
npm run init-db
```

実行結果：
```
データベース初期化を開始します...
新しいデータベースを作成しました
スキーマを適用しました
診療科マスタに8件登録しました
病棟マスタに5件登録しました
データベース初期化が完了しました
```

#### 3-3. サンプルデータの生成

```bash
npm run seed-data
```

実行結果：
```
サンプルデータ生成を開始します...
外来データ5110件を登録しました
入院データ2920件を登録しました
算定種データ3650件を登録しました
サンプルデータ生成が完了しました
```

#### 3-4. サーバーの起動

```bash
npm run dev
```

実行結果：
```
🚀 GraphQL Yoga Server ready at http://localhost:4000/graphql
📊 Dashboard Client ready at http://localhost:3000
```

#### 3-5. ブラウザでアクセス

ブラウザ（EdgeまたはChrome）を開いて以下にアクセス：

```
http://localhost:3000
```

## ✅ 動作確認

### 初期表示の確認事項

1. ✅ ページが正常に読み込まれる
2. ✅ 左側にメニューエリアが表示される
3. ✅ 右側に3x3のグラフエリアが表示される
4. ✅ **開始日が4月1日**に設定されている
5. ✅ **終了日が前日**に設定されている
6. ✅ **9つのグラフが自動的に描画**される
7. ✅ グラフに今年と昨年のデータが表示される（点線が昨年）

### グラフの種類（初期表示）

| 位置 | 種別 | 内容 | 集計 |
|-----|------|------|------|
| 左上(0) | 外来 | 全科積上 | 月次 |
| 中上(1) | 外来 | 内科 | 日次 |
| 右上(2) | 外来 | 小児科 | 日次 |
| 左中(3) | 入院 | 全病棟積上 | 月次 |
| 中中(4) | 入院 | 1病棟 | 日次 |
| 右中(5) | 入院 | ICU | 日次 |
| 左下(6) | 算定種 | 救急医療管理加算 | 月次 |
| 中下(7) | 算定種 | 薬剤管理指導料 | 月次 |
| 右下(8) | 算定種 | 栄養サポートチーム加算 | 月次 |

## 📂 オフライン環境で必要なファイル構成

```
SimpleDashboard/
├── node_modules/          # 依存パッケージ（必須）
├── client/
│   └── public/
│       ├── libs/          # ローカルライブラリ（必須）
│       │   ├── chart.umd.js
│       │   └── js-yaml.min.js
│       ├── index.html
│       ├── style.css
│       └── app.js
├── server/
├── database/
├── config/
└── package.json
```

**重要**: 
- `node_modules`ディレクトリ全体が必要
- `client/public/libs`ディレクトリが必要
- これらがあればCDN接続不要で完全動作

## 🔧 トラブルシューティング

### グラフが表示されない

**原因1**: ライブラリファイルが見つからない

**確認**:
```bash
# libsディレクトリの存在確認
dir client\public\libs

# 以下の2ファイルがあることを確認
# chart.umd.js
# js-yaml.min.js
```

**対処**: ライブラリが無い場合
```bash
npm run setup-libs
```

---

**原因2**: サーバーが起動していない

**確認**:
ブラウザで http://localhost:4000/graphql にアクセスして、GraphQL Playgroundが開くか確認

**対処**:
```bash
# サーバーを再起動
npm run dev
```

---

**原因3**: データベースが初期化されていない

**対処**:
```bash
npm run init-db
npm run seed-data
```

### ポート競合エラー

**症状**: `Error: listen EADDRINUSE: address already in use`

**対処**:
1. 既存のNode.jsプロセスを終了
2. タスクマネージャーで`node.exe`を終了
3. 再度`npm run dev`を実行

### ライブラリが読み込めない

**症状**: ブラウザのコンソールに「404 Not Found: libs/chart.umd.js」

**原因**: `npm install`時に自動セットアップが実行されなかった

**対処**:
```bash
npm run setup-libs
```

## 📝 データのカスタマイズ

### 実データの投入

サンプルデータの代わりに実データを使用する場合：

1. `database/dashboard.db`を削除
2. `npm run init-db`でマスタのみ初期化
3. ETLツールで電子カルテ・医事コンからデータをインポート

### 診療科・病棟の追加

SQLiteクライアント（DB Browser for SQLiteなど）で直接編集：

```sql
-- 診療科追加
INSERT INTO ka_master (ka_name, ka_code, seq, valid)
VALUES ('循環器内科', 9, 9, 1);

-- 病棟追加
INSERT INTO ward_master (ward_name, ward_code, seq, bed_count, valid)
VALUES ('5病棟', 105, 6, 40, 1);
```

## 🔒 セキュリティ

- **ローカル専用**: すべてのデータはローカルPCに保存
- **ネットワーク不要**: インターネット接続なしで動作
- **データ漏洩リスク低**: 外部通信が発生しない

## 📞 サポート

問題が発生した場合：

1. ブラウザの開発者ツール（F12）でエラーを確認
2. このガイドのトラブルシューティングを参照
3. `README.md`の詳細ドキュメントを確認

## 🎯 運用のヒント

### 日次バッチ処理

毎日のデータ更新を自動化する場合：

```bash
# Windowsタスクスケジューラで以下を実行
# 1. ETLでデータ更新
# 2. サーバー再起動
npm run dev
```

### バックアップ

```bash
# データベースのバックアップ
copy database\dashboard.db database\dashboard_backup_%date%.db
```

### 複数端末での利用

同一ネットワーク内の他のPCからアクセスする場合：

1. `server/index.js`と`server/static-server.js`の`localhost`を`0.0.0.0`に変更
2. ファイアウォールでポート3000, 4000を開放
3. `http://サーバーのIPアドレス:3000`でアクセス

## ✨ まとめ

このシステムは**完全オフライン動作**を実現しています：

- ✅ CDN不使用
- ✅ すべてのライブラリをローカル配置
- ✅ インターネット接続不要
- ✅ セキュアな院内専用システム

オンライン環境で`npm install`を実行したプロジェクトをそのままオフライン環境に持ち込めば、すぐに動作します。
