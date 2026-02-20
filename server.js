const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { syncFromGoogleDrive } = require('./lib/driveSync');

const app = express();
const PORT = process.env.PORT || 3000;

// Google Drive 自動同期設定
const SYNC_INTERVAL_MINUTES = parseInt(process.env.DRIVE_SYNC_INTERVAL_MINUTES || '10', 10);
const SYNC_INTERVAL_MS = SYNC_INTERVAL_MINUTES * 60 * 1000;

// サーバー起動時に1回実行 + 定期的に実行
let syncTimer = null;

async function performSync() {
  const result = await syncFromGoogleDrive();
  if (result.success) {
    console.log(`[Drive自動同期] 成功: ${result.importedCount}件をインポートしました (${result.timestamp})`);
  } else {
    // 環境変数未設定の場合は警告のみ（手動CSV使用時は正常）
    if (result.reason === '環境変数が設定されていません') {
      console.log('[Drive自動同期] スキップ: Google Drive連携が設定されていません（手動CSV使用時は正常です）');
    } else {
      console.warn(`[Drive自動同期] 失敗: ${result.reason}`);
    }
  }
}

// 初回実行（起動後30秒待ってから）
setTimeout(() => {
  performSync();
}, 30000);

// 定期実行を開始
if (SYNC_INTERVAL_MS > 0) {
  syncTimer = setInterval(performSync, SYNC_INTERVAL_MS);
  console.log(`[Drive自動同期] ${SYNC_INTERVAL_MINUTES}分ごとに自動同期します`);
}

// ミドルウェア設定
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'clarinet-association-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // HTTPSの場合はtrueに変更
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

// ルート設定
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);

// ルートページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 会員証ページ
app.get('/card', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'card.html'));
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'ログアウトに失敗しました' });
    }
    res.json({ success: true });
  });
});

const server = app.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
  console.log(`http://localhost:${PORT} でアクセスできます`);
});

// サーバー終了時にタイマーをクリーンアップ
process.on('SIGTERM', () => {
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  server.close();
});

process.on('SIGINT', () => {
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  server.close();
  process.exit(0);
});
