# Render で会員証システムを公開する手順

この手順に従うと、会員証システムをインターネット上で公開し、**どこからでもアクセスできる**ようになります。

---

## 📋 事前準備

- GitHub アカウント（無料）
- Render アカウント（無料プランあり）
- Google Cloud のサービスアカウント設定（Drive連携を使う場合）

---

## ステップ1: GitHub にコードをアップロード

### 1-1. GitHub でリポジトリを作成

1. https://github.com にログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例：`clarinet-membership-card`）
4. 「Public」または「Private」を選択
5. 「Create repository」をクリック

### 1-2. ローカルのコードをGitHubにアップロード

**Gitがインストールされている場合：**

PowerShellで以下を実行：

```powershell
cd "D:\tomoh\Documents\vsc"

# Gitリポジトリとして初期化（まだの場合）
git init

# ファイルを追加
git add .

# コミット
git commit -m "Initial commit"

# GitHubのリポジトリURLを追加（あなたのリポジトリURLに置き換える）
git remote add origin https://github.com/あなたのユーザー名/clarinet-membership-card.git

# アップロード
git branch -M main
git push -u origin main
```

**Gitがインストールされていない場合：**

1. GitHub Desktop をインストール（https://desktop.github.com/）
2. GitHub Desktop で「Add」→「Add Existing Repository」
3. `D:\tomoh\Documents\vsc` を選択
4. 「Publish repository」をクリック

---

## ステップ2: Render でWebサービスを作成

### 2-1. Render にログイン

1. https://render.com にアクセス
2. 「Get Started for Free」でアカウント作成（GitHubアカウントでログイン可能）

### 2-2. 新しいWebサービスを作成

1. Render のダッシュボードで「**New +**」→「**Web Service**」をクリック
2. 「**Connect GitHub**」をクリック（初回のみ）
3. GitHub のリポジトリを選択（`clarinet-membership-card` など）
4. 設定を入力：
   - **Name**: `clarinet-membership-card`（任意）
   - **Region**: `Singapore` または `Oregon`（日本に近い）
   - **Branch**: `main`
   - **Root Directory**: （空欄のまま）
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. 「**Create Web Service**」をクリック

---

## ステップ3: 環境変数を設定

### 3-1. Render の環境変数画面を開く

作成したWebサービスの画面で、左メニューの「**Environment**」をクリック

### 3-2. 環境変数を追加

「**Add Environment Variable**」をクリックして、以下を追加：

| Key | Value |
|-----|-------|
| `SESSION_SECRET` | ランダムな文字列（例：`your-secret-key-here-2024-random-string`） |
| `PORT` | `10000`（Renderが自動で設定するので、この値は無視されます） |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | `google-service-account.json` |
| `GOOGLE_DRIVE_FILE_ID` | （DriveのCSVファイルID） |
| `DRIVE_SYNC_INTERVAL_MINUTES` | `10`（10分ごとに自動同期） |

### 3-3. サービスアカウント鍵をアップロード

**方法A: 環境変数として設定（推奨）**

1. ローカルの `google-service-account.json` を開く
2. 中身をすべてコピー
3. Render の環境変数で：
   - **Key**: `GOOGLE_SERVICE_ACCOUNT_KEY`（新規追加）
   - **Value**: コピーしたJSONをそのまま貼り付け
4. `server.js` を修正して、環境変数から読み込むようにする（後述）

**方法B: GitHubにアップロード（非推奨）**

セキュリティ上、GitHubに鍵ファイルをアップロードするのは避けてください。

---

## ステップ4: デプロイ

1. 環境変数を設定したら、Render が自動でデプロイを開始します
2. 「**Events**」タブでデプロイの進行状況を確認
3. 「**Live**」と表示されれば完了

---

## ステップ5: URLを確認

デプロイ完了後、画面上部に表示されるURL（例：`https://clarinet-membership-card.onrender.com`）が、**会員証システムのURL**です。

このURLを会員に共有すれば、どこからでもアクセスできます。

---

## 🔄 更新方法

### コードを更新する場合

1. ローカルでコードを変更
2. GitHubにプッシュ：
   ```powershell
   git add .
   git commit -m "更新内容"
   git push
   ```
3. Render が自動で再デプロイします

### CSVを更新する場合

1. Google Drive に新しいCSVをアップロード（同じファイルIDのファイルを置き換え）
2. サーバーが自動で同期します（設定した間隔ごと）
3. または、手動で同期したい場合は、Render の「**Shell**」タブで：
   ```bash
   node scripts/sync-google-drive-csv.js
   ```

---

## ⚠️ 注意事項

### 無料プランの制限

- 15分間アクセスがないと**スリープ**します
- 次回アクセス時に自動で起動しますが、初回アクセスが遅くなることがあります
- 有料プラン（$7/月）にすると、常時起動できます

### セキュリティ

- `SESSION_SECRET` は**必ずランダムな文字列**にしてください
- サービスアカウント鍵は**GitHubにアップロードしない**でください
- `.gitignore` に `google-service-account.json` が含まれていることを確認

---

## 🆘 トラブルシューティング

### デプロイが失敗する

- 「**Logs**」タブでエラーメッセージを確認
- `npm install` が失敗している場合、`package.json` を確認
- 環境変数が正しく設定されているか確認

### 会員証が表示されない

- 環境変数 `GOOGLE_DRIVE_FILE_ID` が正しいか確認
- Drive のCSVがサービスアカウントに共有されているか確認
- 「**Logs**」タブで同期エラーがないか確認

---

## 📝 次のステップ

デプロイが完了したら：

1. URLを会員に共有
2. テストログインで動作確認
3. Google Drive にCSVをアップロードして、自動同期を確認

これで「DriveにCSVをアップロードするだけで、自動で会員証が更新される」システムが完成です！
