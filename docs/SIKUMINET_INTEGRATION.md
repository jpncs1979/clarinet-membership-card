# シクミネット連携ガイド

## 概要
このシステムはシクミネット（会員登録サービス）と連携して、会費支払い状況を自動的に確認・更新できます。

## 連携方法

### 1. API連携（推奨）
シクミネットがAPIを提供している場合、`scripts/sync-sikuminet.js`を編集して実装します。

```javascript
async function fetchSikumiNetData(sikumiNetId) {
  const response = await fetch(`https://api.sikuminet.com/members/${sikumiNetId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.SIKUMINET_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
}
```

### 2. CSV/Excelエクスポート連携
シクミネットから会員情報をCSVやExcelでエクスポートできる場合：

1. エクスポートしたファイルを`data/`フォルダに配置
2. `scripts/import-from-csv.js`（作成が必要）でインポート
3. 定期実行で更新

### 3. 手動更新
`scripts/create-member.js`を使用して手動で会員情報を登録・更新

## 定期同期の設定

### Cron（Linux/Mac）
```bash
# 毎日午前2時に同期
0 2 * * * cd /path/to/project && node scripts/sync-sikuminet.js
```

### Windows タスクスケジューラ
1. タスクスケジューラを開く
2. 基本タスクを作成
3. トリガー: 毎日
4. 操作: プログラムの開始
5. プログラム: `node`
6. 引数: `scripts/sync-sikuminet.js`
7. 開始場所: プロジェクトのパス

## データ構造

### 会員情報（members.json）
```json
{
  "members": [
    {
      "id": "member-001",
      "name": "山田 太郎",
      "memberNumber": "CL-2024-001",
      "email": "yamada@example.com",
      "birthdayHash": "...",
      "paymentStatus": "paid",
      "paymentDate": "2024-01-15",
      "expiryDate": "2024-12-31",
      "sikumiNetData": {
        "memberId": "sikumi-001",
        "lastSync": "2024-01-15T10:00:00Z"
      }
    }
  ]
}
```

### シクミネットから取得するデータ
- `paymentStatus`: "paid" または "unpaid"
- `paymentDate`: 支払い日（YYYY-MM-DD）
- `expiryDate`: 有効期限（YYYY-MM-DD）

## 環境変数
`.env`ファイルに以下を追加：
```
SIKUMINET_API_KEY=your-api-key-here
SIKUMINET_API_URL=https://api.sikuminet.com
```

## トラブルシューティング

### 同期が失敗する場合
1. APIキーが正しいか確認
2. ネットワーク接続を確認
3. シクミネットのAPI仕様を確認
4. `scripts/sync-sikuminet.js`のエラーハンドリングを確認

### 会員情報が更新されない場合
1. `data/members.json`の`sikumiNetData.memberId`が正しく設定されているか確認
2. 同期スクリプトのログを確認
3. ファイルの書き込み権限を確認
