# Google Drive にCSVをアップロードして参照する（おすすめ方式）

## 結論（安全なやり方）
CSVをDriveに置いたまま、**Drive API（サービスアカウント）**でサーバーが**非公開のまま**CSVを読み取り、会員資格（会費状況・有効期限など）を会員証に反映します。

※「リンク共有で誰でもダウンロード可」にすると、CSVに住所や電話番号が含まれる場合に漏えいリスクが高いので非推奨です。

---

## 1. 事前に用意するもの
- Googleアカウント
- Google Cloud Console を操作できる権限
- シクミネットから出力したCSV（またはCSVファイルとして保存したもの）

---

## 2. Google Cloud 側の設定（1回だけ）
### 2-1. プロジェクト作成
Google Cloud Consoleで新規プロジェクトを作成します。

### 2-2. Drive API を有効化
「APIとサービス」→「ライブラリ」→ **Google Drive API** を有効化します。

### 2-3. サービスアカウント作成
「IAM と管理」→「サービス アカウント」→ 作成します。

### 2-4. 鍵（JSON）を作成してダウンロード
作成したサービスアカウントの「鍵」から **鍵JSON** を作成してダウンロードします。

ダウンロードしたJSONは、たとえば次に保存します：
- `D:\tomoh\Documents\vsc\google-service-account.json`

---

## 3. Google Drive 側の設定（CSVを共有）
### 3-1. CSVをDriveにアップロード
シクミネットのCSVをGoogle Driveにアップロードします。

### 3-2. サービスアカウントに共有
サービスアカウントにはメールアドレス（例: `xxxx@yyyy.iam.gserviceaccount.com`）があります。
そのアドレスを、アップロードしたCSVファイルの「共有」に追加し、**閲覧者**権限を付与します。

---

## 4. このシステム側の設定（.env）

### 4-1. .env ファイルを開く
1. エクスプローラーで `D:\tomoh\Documents\vsc` フォルダを開く
2. **`.env`** という名前のファイルを探す（先頭にドットが付きます）
3. メモ帳や Cursor（VS Code）で開く  
   - 右クリック → 「プログラムから開く」→ メモ帳 でもOK

### 4-2. サービスアカウントの鍵ファイルを置く
1. Google Cloud でダウンロードした **JSON鍵** を、次の場所にコピーする：  
   `D:\tomoh\Documents\vsc\google-service-account.json`  
   （ファイル名はそのままでOK。別名にした場合は 4-3 でその名前にする）
2. このファイルが `D:\tomoh\Documents\vsc` フォルダ内にあることを確認する

### 4-3. .env に2行追加する
`.env` の **いちばん下** に、次の2行を追加する（既にある行はそのまま残す）。

```
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=D:\tomoh\Documents\vsc\google-service-account.json
GOOGLE_DRIVE_FILE_ID=ここにファイルIDを貼る
```

- 1行目：鍵ファイルの**フルパス**。別の場所に置いた場合はそのパスに書き換える
- 2行目：`ここにファイルIDを貼る` の部分を、**DriveのCSVファイルID** に置き換える（下記）

### ファイルIDの取り方
1. Google Drive で対象のCSVファイルを **1回クリック** して選択
2. 画面上部の **共有（人＋）アイコン** をクリック
3. 共有ダイアログ内の **「リンクをコピー」** またはリンク表示欄をコピー
4. コピーしたURLは次のような形：  
   `https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/view?usp=sharing`  
5. **`/d/` と `/view` の間** の文字列（例：`1AbCdEfGhIjKlMnOpQrStUvWxYz123456`）がファイルID
6. その文字列だけを `.env` の `GOOGLE_DRIVE_FILE_ID=` の右に書く（=の直後、改行なし）

**記入例（ファイルIDが `1ABCdefGHI123` の場合）：**
```
GOOGLE_DRIVE_FILE_ID=1ABCdefGHI123
```

### 4-4. 保存する
`.env` を上書き保存して閉じる。

---

## 5. 同期（CSV→会員資格反映）
PowerShellで次を実行します。

```powershell
cd "D:\tomoh\Documents\vsc"
npm install
node scripts/sync-google-drive-csv.js
```

成功すると：
- `data/sikuminet.csv` に最新CSVが保存される
- `data/members.json` が更新される（会員証の判定に使用）

---

## 6. 運用（毎回の更新）
更新のたびにやることはこれだけです：
1. Driveに最新CSVをアップロード（同じファイルを置き換えてOK）
2. `node scripts/sync-google-drive-csv.js` を実行
3. サーバーを再起動（`Ctrl + C` → `npm start`）

---

## 7. よくあるトラブル
### 7-1. `File not found` や `The caller does not have permission`
- Drive側でサービスアカウントに共有できているか確認
- `GOOGLE_DRIVE_FILE_ID` が正しいか確認

### 7-2. CSVの列名が違って取り込めない
`scripts/import-sikuminet-csv.js` は列名候補で判定します。列名が違う場合は、CSVのヘッダーに合わせて候補を増やせます。

