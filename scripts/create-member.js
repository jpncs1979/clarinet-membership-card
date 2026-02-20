const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const MEMBERS_FILE = path.join(__dirname, '..', 'data', 'members.json');

// 誕生日をハッシュ化
function hashBirthday(birthday) {
  return crypto.createHash('sha256').update(birthday).digest('hex');
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

// 会員データを保存
async function saveMembers(data) {
  await fs.writeFile(MEMBERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 会員を作成
async function createMember() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  try {
    console.log('=== 会員情報登録 ===\n');

    const name = await question('氏名: ');
    const email = await question('メールアドレス: ');
    const birthday = await question('誕生日 (YYYY-MM-DD): ');
    const memberNumber = await question('会員番号 (例: CL-2024-001): ');
    const paymentStatus = await question('支払い状況 (paid/unpaid): ') || 'paid';
    const paymentDate = await question('支払い日 (YYYY-MM-DD): ') || new Date().toISOString().split('T')[0];
    const expiryDate = await question('有効期限 (YYYY-MM-DD): ') || new Date().getFullYear() + '-12-31';
    const sikumiNetId = await question('シクミネットID (任意): ') || '';

    const data = await loadMembers();
    const newMember = {
      id: `member-${Date.now()}`,
      name: name.trim(),
      memberNumber: memberNumber.trim(),
      email: email.trim().toLowerCase(),
      birthdayHash: hashBirthday(birthday.trim()),
      paymentStatus: paymentStatus.trim(),
      paymentDate: paymentDate.trim(),
      expiryDate: expiryDate.trim(),
      sikumiNetData: sikumiNetId ? {
        memberId: sikumiNetId.trim(),
        lastSync: new Date().toISOString()
      } : null
    };

    data.members.push(newMember);
    await saveMembers(data);

    console.log('\n✓ 会員情報を登録しました！');
    console.log(`会員番号: ${newMember.memberNumber}`);
    console.log(`誕生日ハッシュ: ${newMember.birthdayHash.substring(0, 16)}...`);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    rl.close();
  }
}

createMember();
