# セットアップガイド - Windows 10環境

このガイドでは、Windows 10環境で病院ダッシュボードシステムをセットアップする手順を説明します。

## 📋 前提条件

- **OS**: Windows 10
- **Node.js**: v18以上がインストール済み
  - [Node.js公式サイト](https://nodejs.org/)からダウンロード・インストール
- **ブラウザ**: Microsoft Edge または Google Chrome
- **インターネット接続**: 初回のパッケージインストール時のみ必要

## 🚀 セットアップ手順

### 1. リポジトリのクローン

コマンドプロンプトまたはPowerShellを開き、以下を実行：

```bash
git clone https://github.com/hiro1966/SimpleDashboard.git
cd SimpleDashboard
```

Git がインストールされていない場合は、[GitHubのZIPダウンロード](https://github.com/hiro1966/SimpleDashboard/archive/refs/heads/main.zip)から取得してください。

### 2. 依存パッケージのインストール

```bash
npm install
```

**重要**: このシステムは`sql.js`（Pure JavaScript実装）を使用しているため、PythonやVisual Studio Build Toolsは不要です。エラーなくインストールが完了するはずです。

### 3. データベースの初期化

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

### 4. サンプルデータの生成

```bash
npm run seed-data
```

実行結果：
```
サンプルデータ生成を開始します...
外来データを生成中...
外来データ5110件を登録しました
入院データを生成中...
入院データ2920件を登録しました
算定種データを生成中...
算定種データ3650件を登録しました
サンプルデータ生成が完了しました
```

このコマンドで2年分（730日）のサンプルデータが生成されます。

### 5. サーバーの起動

#### 方法A: サーバーとクライアントを同時起動（推奨）

```bash
npm run dev
```

#### 方法B: 個別に起動

**ターミナル1でGraphQLサーバー起動:**
```bash
npm run server
```

**ターミナル2でクライアントサーバー起動:**
```bash
npm run client
```

### 6. ブラウザでアクセス

ブラウザを開いて以下にアクセス：

- **ダッシュボード**: http://localhost:3000
- **GraphQL Playground**: http://localhost:4000/graphql

## 🎯 初回起動時の動作

1. ページが読み込まれると、自動的に`config/dashboard-config.yaml`が読み込まれます
2. 9つのグラフが自動的に描画されます
3. **デフォルト表示期間**: 今年の4月1日～前日まで
4. 前年比較が有効な状態で表示されます（昨年のデータが点線で表示）

## 📊 使い方

### グラフの変更方法

1. 変更したいグラフエリアをクリック（青枠で選択状態になります）
2. 左メニューで設定を変更：
   - **表示種別**: 外来/入院/算定種
   - **診療科**: 全数、全科積上、または個別の診療科
   - **病棟**: 全数、全病棟積上、または個別の病棟
   - **初診・再診**: 両方/初診のみ/再診のみ
   - **集計期間**: 日次/月次
   - **期間選択**: 開始日と終了日を指定
   - **前年比較表示**: チェックを入れると昨年データも表示
3. 「選択グラフを更新」ボタンをクリック

### 初期設定に戻す

「初期設定を読込」ボタンをクリックすると、YAML設定ファイルの内容で全グラフがリセットされます。

## 🔧 トラブルシューティング

### グラフが表示されない

**症状**: ページは表示されるが、グラフエリアが空白

**原因と対処**:

1. **GraphQLサーバーが起動していない**
   - コマンドプロンプトで`npm run server`を実行
   - http://localhost:4000/graphql にアクセスして確認

2. **データベースが初期化されていない**
   ```bash
   npm run init-db
   npm run seed-data
   ```

3. **ブラウザのコンソールエラーを確認**
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーメッセージを確認

### ポート競合エラー

**症状**: `Error: listen EADDRINUSE: address already in use :::3000`

**対処**:
1. 既に起動しているサーバーを停止する
2. または、`server/index.js`と`server/static-server.js`のポート番号を変更

### npm installでエラーが出る

**症状**: パッケージインストール中にエラー

**対処**:
1. Node.jsのバージョンを確認: `node -v` (v18以上が必要)
2. npmキャッシュをクリア:
   ```bash
   npm cache clean --force
   npm install
   ```

## 📁 ディレクトリ構造

```
SimpleDashboard/
├── server/
│   ├── index.js              # GraphQLサーバー (ポート4000)
│   └── static-server.js      # 静的ファイルサーバー (ポート3000)
├── client/public/
│   ├── index.html            # メインページ
│   ├── style.css             # スタイルシート
│   └── app.js                # クライアントロジック
├── database/
│   ├── schema.sql            # データベーススキーマ
│   ├── init-db.js            # 初期化スクリプト
│   ├── seed-data.js          # サンプルデータ生成
│   └── dashboard.db          # SQLiteデータベース（自動生成）
├── config/
│   └── dashboard-config.yaml # 初期グラフ設定
└── package.json
```

## ⚙️ カスタマイズ

### 初期表示グラフの変更

`config/dashboard-config.yaml`を編集：

```yaml
graphs:
  - position: 0          # グラフ位置 (0-8)
    type: outpatient     # outpatient/inpatient/billing
    ka_code: null        # null=全科, 数値=個別診療科
    view_type: stacked   # stacked/individual
    time_range: monthly  # daily/monthly
```

### 診療科・病棟マスタの変更

データベースに直接SQLで挿入：

```sql
-- 診療科追加
INSERT INTO ka_master (ka_name, ka_code, seq, valid)
VALUES ('循環器内科', 9, 9, 1);

-- 病棟追加
INSERT INTO ward_master (ward_name, ward_code, seq, bed_count, valid)
VALUES ('5病棟', 105, 6, 40, 1);
```

### デフォルト期間の変更

`client/public/app.js`の`setDefaultDates()`関数を編集：

```javascript
function setDefaultDates() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 4月1日を開始日に設定
    const currentYear = today.getFullYear();
    const startDate = new Date(currentYear, 3, 1); // 月は0始まり

    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = yesterday.toISOString().split('T')[0];
}
```

## 🔒 セキュリティとデータ

- このシステムは**ローカル環境**で動作します
- **インターネット接続不要**（初回インストール後）
- データベースは`database/dashboard.db`にローカル保存
- 実データを使用する場合は、ETL処理で電子カルテ・医事コンからインポート

## 📞 サポート

問題が発生した場合：

1. このガイドのトラブルシューティングセクションを確認
2. GitHubのIssueに報告: https://github.com/hiro1966/SimpleDashboard/issues
3. ブラウザの開発者ツール（F12）でエラーメッセージを確認

## 📄 関連ドキュメント

- [README.md](README.md) - システム全体の概要
- [config/dashboard-config.yaml](config/dashboard-config.yaml) - 初期グラフ設定
- [database/schema.sql](database/schema.sql) - データベーススキーマ
