# デプロイメントガイド

## クラウドストレージへの配置

### 1. GitHub/GitLab + クラウドホスティング

#### Heroku
```bash
# Heroku CLIでログイン
heroku login

# アプリを作成
heroku create clarinet-association-membership

# 環境変数を設定
heroku config:set SESSION_SECRET=your-secret-key

# デプロイ
git push heroku main
```

#### Render
1. Renderのダッシュボードで「New Web Service」を選択
2. GitHubリポジトリを接続
3. 環境変数を設定
4. デプロイ

#### Railway
1. Railwayでプロジェクトを作成
2. GitHubリポジトリを接続
3. 環境変数を設定
4. 自動デプロイ

### 2. 会員データの管理

#### オプション1: データベース（推奨）
本番環境では、JSONファイルの代わりにデータベースを使用することを推奨します。

**MongoDB例:**
```javascript
// routes/members.js を修正
const mongoose = require('mongoose');
const Member = require('../models/Member');

// MongoDB接続
mongoose.connect(process.env.MONGODB_URI);
```

**PostgreSQL例:**
```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

#### オプション2: クラウドストレージ
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

`data/members.json`をクラウドストレージに保存し、定期的に同期

### 3. セキュリティ設定

#### HTTPSの有効化
```javascript
// server.js
app.use(session({
  cookie: {
    secure: true, // HTTPSのみ
    httpOnly: true,
    sameSite: 'strict'
  }
}));
```

#### 環境変数の保護
- `.env`ファイルを`.gitignore`に追加（済み）
- 本番環境では環境変数として設定
- 機密情報をコードに含めない

### 4. 定期同期の設定

#### GitHub Actions
`.github/workflows/sync.yml`を作成：
```yaml
name: Sync SikumiNet
on:
  schedule:
    - cron: '0 2 * * *'  # 毎日午前2時
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: node scripts/sync-sikuminet.js
        env:
          SIKUMINET_API_KEY: ${{ secrets.SIKUMINET_API_KEY }}
```

### 5. バックアップ

会員データのバックアップを定期的に取得：
```bash
# バックアップスクリプト例
#!/bin/bash
DATE=$(date +%Y%m%d)
cp data/members.json "backups/members-${DATE}.json"
```

## パフォーマンス最適化

### キャッシング
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1時間キャッシュ
```

### CDN
静的ファイル（CSS、JS）をCDNに配置

## 監視とログ

### ログ管理
```javascript
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```
