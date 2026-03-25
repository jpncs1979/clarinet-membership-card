const crypto = require('crypto');

/**
 * CSV 再取り込み後も変わらない会員 ID（会員番号 + メールで決定）
 */
function stableMemberId(memberNumber, email) {
  const num = String(memberNumber ?? '').trim();
  const em = String(email ?? '').trim().toLowerCase();
  const h = crypto.createHash('sha256').update(`${num}\0${em}`).digest('hex');
  return `member-${h}`;
}

module.exports = { stableMemberId };
