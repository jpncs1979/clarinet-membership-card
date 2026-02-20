const crypto = require('crypto');

/**
 * 誕生日をハッシュ化するユーティリティ
 * 
 * 使用方法:
 * node scripts/hash-birthday.js YYYY-MM-DD
 * 
 * 例:
 * node scripts/hash-birthday.js 1990-01-15
 */

const birthday = process.argv[2];

if (!birthday) {
  console.error('使用方法: node scripts/hash-birthday.js YYYY-MM-DD');
  console.error('例: node scripts/hash-birthday.js 1990-01-15');
  process.exit(1);
}

// 日付形式の検証
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(birthday)) {
  console.error('エラー: 誕生日はYYYY-MM-DD形式で入力してください');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(birthday).digest('hex');
console.log(`誕生日: ${birthday}`);
console.log(`ハッシュ: ${hash}`);
