const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { MEMBERS_FILE, MEMBERS_JSON_BASENAME } = require('./lib/membersDataPath');
require('dotenv').config();

const { syncMembersCsvOnStartup, startMembersCsvWatch } = require('./lib/watchMembersCsv');

const app = express();
const PORT = process.env.PORT || 3000;

let membersCsvWatch = null;

// 本番（Render 等）ではリバースプロキシ経由の HTTPS を信頼（req.secure / Cookie の判定に必要）
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ミドルウェア設定（セッションは static より前に置く）
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// secure: true 固定だと、NODE_ENV=production のまま http://localhost で Cookie が届かず
// ログイン直後に /card へ飛んでもセッションが無く、またログイン画面に戻る。
app.use(session({
  secret: process.env.SESSION_SECRET || 'clarinet-association-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: 'auto',
    sameSite: 'lax',
    httpOnly: true,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.static('public'));

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

const server = app.listen(PORT, async () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
  console.log(`http://localhost:${PORT} でアクセスできます`);
  await syncMembersCsvOnStartup();
  membersCsvWatch = startMembersCsvWatch();
  try {
    const raw = await fs.readFile(MEMBERS_FILE, 'utf8');
    const n = JSON.parse(raw).members?.length ?? 0;
    if (n === 0) {
      console.warn(`[会員データ] ${MEMBERS_JSON_BASENAME} に会員が0件です。data の CSV を更新するか import スクリプトを実行してください`);
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(`[会員データ] data/${MEMBERS_JSON_BASENAME} がありません。CSV を data に置くか import スクリプトを実行してください`);
    }
  }
});

process.on('SIGTERM', () => {
  if (membersCsvWatch) {
    membersCsvWatch.close();
  }
  server.close();
});

process.on('SIGINT', () => {
  if (membersCsvWatch) {
    membersCsvWatch.close();
  }
  server.close();
  process.exit(0);
});
