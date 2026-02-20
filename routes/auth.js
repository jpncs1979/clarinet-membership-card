const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 会員データファイルのパス
const MEMBERS_FILE = path.join(__dirname, '..', 'data', 'members.json');

// 誕生日をハッシュ化して比較（セキュリティのため）
function hashBirthday(birthday) {
  return crypto.createHash('sha256').update(birthday).digest('hex');
}

// 会員データを読み込む
async function loadMembers() {
  try {
    const data = await fs.readFile(MEMBERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空配列を返す
    return { members: [] };
  }
}

// 認証処理
router.post('/login', async (req, res) => {
  try {
    const { email, birthday } = req.body;

    // 入力検証
    if (!email || !birthday) {
      return res.status(400).json({ 
        error: 'メールアドレスと誕生日を入力してください' 
      });
    }

    // 日付形式の検証（YYYY-MM-DD）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthday)) {
      return res.status(400).json({ 
        error: '誕生日はYYYY-MM-DD形式で入力してください' 
      });
    }

    // 会員データを読み込む
    const data = await loadMembers();
    const members = data.members || [];

    // メールアドレスと誕生日で会員を検索
    const birthdayHash = hashBirthday(birthday);
    const member = members.find(m => 
      m.email.toLowerCase() === email.toLowerCase() && 
      m.birthdayHash === birthdayHash
    );

    if (!member) {
      return res.status(401).json({ 
        error: '認証に失敗しました。メールアドレスまたは誕生日が正しくありません。' 
      });
    }

    // 会費支払い状況を確認
    if (member.paymentStatus !== 'paid') {
      return res.status(403).json({ 
        error: '会費が未払いのため、会員証を表示できません。' 
      });
    }

    // セッションに会員情報を保存
    req.session.authenticated = true;
    req.session.memberId = member.id;
    req.session.memberName = member.name;
    req.session.memberNumber = member.memberNumber;

    res.json({ 
      success: true, 
      member: {
        name: member.name,
        memberNumber: member.memberNumber,
        email: member.email
      }
    });

  } catch (error) {
    console.error('認証エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// セッション確認
router.get('/check', (req, res) => {
  if (req.session.authenticated) {
    res.json({ 
      authenticated: true,
      member: {
        name: req.session.memberName,
        memberNumber: req.session.memberNumber
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
