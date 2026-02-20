const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// 会員データファイルのパス
const MEMBERS_FILE = path.join(__dirname, '..', 'data', 'members.json');

// 認証ミドルウェア
function requireAuth(req, res, next) {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  next();
}

// 会員データを読み込む
async function loadMembers() {
  try {
    const data = await fs.readFile(MEMBERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { members: [] };
  }
}

// 会員情報を取得
router.get('/info', requireAuth, async (req, res) => {
  try {
    const data = await loadMembers();
    const members = data.members || [];
    const member = members.find(m => m.id === req.session.memberId);

    if (!member) {
      return res.status(404).json({ error: '会員情報が見つかりません' });
    }

    // 機密情報を除外して返す
    res.json({
      name: member.name,
      memberNumber: member.memberNumber,
      memberType: member.memberType || '',
      email: member.email,
      paymentStatus: member.paymentStatus,
      paymentDate: member.paymentDate,
      expiryDate: member.expiryDate
    });

  } catch (error) {
    console.error('会員情報取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// シクミネット連携：会費支払い状況確認
router.get('/check-payment/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // TODO: シクミネットのAPIと連携
    // 現在はローカルデータを参照
    const data = await loadMembers();
    const members = data.members || [];
    const member = members.find(m => m.id === memberId || m.memberNumber === memberId);

    if (!member) {
      return res.status(404).json({ error: '会員が見つかりません' });
    }

    res.json({
      memberNumber: member.memberNumber,
      paymentStatus: member.paymentStatus,
      paymentDate: member.paymentDate,
      expiryDate: member.expiryDate,
      // シクミネットからの情報（実装時に追加）
      sikumiNetData: member.sikumiNetData || null
    });

  } catch (error) {
    console.error('支払い状況確認エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
