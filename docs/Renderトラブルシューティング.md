# Render デプロイ トラブルシューティング

## サイトにアクセスできない場合

### 1. Render のダッシュボードを確認

1. https://dashboard.render.com にログイン
2. 作成したWebサービスをクリック
3. 「**Logs**」タブを開く
4. エラーメッセージを確認

### よくあるエラーと対処法

#### 「Application failed to respond」
- **原因**: サーバーが起動していない、またはポートが間違っている
- **対処**: `package.json` の `start` コマンドが `node server.js` になっているか確認

#### 「Environment variable not found」
- **原因**: 環境変数が設定されていない
- **対処**: 「Environment」タブで `SESSION_SECRET` など必須の環境変数が設定されているか確認

#### 「Cannot find module」
- **原因**: 依存パッケージがインストールされていない
- **対処**: 「Events」タブで `npm install` が成功しているか確認

#### 「Google Drive 同期エラー」
- **原因**: Drive連携の環境変数が設定されていない、または鍵ファイルが見つからない
- **対処**: 
  - `GOOGLE_SERVICE_ACCOUNT_KEY` または `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` が設定されているか確認
  - `GOOGLE_DRIVE_FILE_ID` が設定されているか確認
  - エラーが出てもサーバーは起動するので、Drive連携なしでも動作します

### 2. デプロイ状況を確認

「**Events**」タブで：
- 「**Live**」と表示されていれば成功
- 「**Failed**」と表示されていれば失敗（ログを確認）

### 3. 手動で再デプロイ

1. 「**Manual Deploy**」→「**Deploy latest commit**」をクリック
2. デプロイが完了するまで待つ（数分かかります）

---

## 誕生日入力形式について

`<input type="date">` は、ブラウザの言語設定によって**表示形式**が変わりますが、**実際に送信される値は常に `YYYY-MM-DD` 形式**です。

- 表示が「mm/dd/yyyy」でも、送信値は「yyyy-mm-dd」
- 表示が「yyyy-mm-dd」でも、送信値は「yyyy-mm-dd」

サーバー側も `YYYY-MM-DD` 形式を期待しているので、**どちらの表示形式でも問題ありません**。

---

## テスト方法

### ローカルで確認

1. サーバーを起動：
   ```powershell
   npm start
   ```
2. `http://localhost:3000` にアクセス
3. ログインを試す

### Renderで確認

1. RenderのURL（例：`https://clarinet-membership-card.onrender.com`）にアクセス
2. ログインを試す
3. エラーが出る場合は、Renderの「Logs」タブでエラーメッセージを確認

---

## よくある質問

### Q: Renderのサイトが「Application failed to respond」と表示される

**A**: サーバーが起動していない可能性があります。Renderの「Logs」タブでエラーメッセージを確認してください。

### Q: ローカルでは動くが、Renderでは動かない

**A**: 環境変数が設定されていない可能性があります。Renderの「Environment」タブで、`.env` に書いた環境変数がすべて設定されているか確認してください。

### Q: 誕生日の入力形式が違う

**A**: ブラウザの表示形式の違いです。実際の送信値は同じ `YYYY-MM-DD` 形式なので、問題ありません。

---

## サポートが必要な場合

Renderの「Logs」タブのエラーメッセージをコピーして、その内容を共有してください。具体的なエラーメッセージがあれば、より詳しく対処法を案内できます。
