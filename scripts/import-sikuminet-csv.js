const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CSV_FILE = path.join(DATA_DIR, 'sikuminet.csv');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');

// 誕生日をハッシュ化
function hashBirthday(birthday) {
  const str = String(birthday).trim();
  if (!str) return '';
  return crypto.createHash('sha256').update(str).digest('hex');
}

// 日付を YYYY-MM-DD に正規化
function normalizeDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  // 例: 2026/02/18
  const m1 = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m1) {
    const y = m1[1];
    const m = String(m1[2]).padStart(2, '0');
    const d = String(m1[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 列名の候補（シクミネットやExcelの出力に合わせて増やせます）
const COL = {
  name: ['氏名', '名前', 'name', '会員名'],
  email: ['メールアドレス', 'メール', 'email', 'Eメール', 'システム用メールアドレス'],
  birthday: ['誕生日', '生年月日', 'birthday'],
  memberNumber: ['会員番号', '会員No', 'member_number', '番号'],
  paymentStatus: ['支払い状況', '状態', 'payment_status', '会費'],
  paymentDate: ['支払い日', '入金日', 'payment_date'],
  expiryDate: ['有効期限', '期限', 'expiry_date', '有効期限日', '会員有効終了日'],
  status: ['ステータス', 'status'],
  withdrawDate: ['退会日'],
};

function findHeaderIndex(headers, candidates) {
  const lower = (s) => String(s).trim().toLowerCase();
  for (const cand of candidates) {
    const i = headers.findIndex((h) => lower(h) === lower(cand));
    if (i >= 0) return i;
  }
  return -1;
}

async function run() {
  let csvPath = process.argv[2] || CSV_FILE;
  const absolutePath = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);

  try {
    const content = await fs.readFile(absolutePath, 'utf8');
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('CSVにデータ行がありません。');
      process.exit(1);
    }

    const headers = Object.keys(rows[0]);
    const idx = {
      name: findHeaderIndex(headers, COL.name),
      email: findHeaderIndex(headers, COL.email),
      birthday: findHeaderIndex(headers, COL.birthday),
      memberNumber: findHeaderIndex(headers, COL.memberNumber),
      paymentStatus: findHeaderIndex(headers, COL.paymentStatus),
      paymentDate: findHeaderIndex(headers, COL.paymentDate),
      expiryDate: findHeaderIndex(headers, COL.expiryDate),
      status: findHeaderIndex(headers, COL.status),
      withdrawDate: findHeaderIndex(headers, COL.withdrawDate),
    };

    if (idx.name < 0 || idx.email < 0 || idx.birthday < 0) {
      console.error('CSVの1行目（ヘッダー）に、次のいずれかが必要です：');
      console.error('  氏名: 氏名, 名前, name, 会員名');
      console.error('  メール: メールアドレス, メール, email');
      console.error('  誕生日: 誕生日, 生年月日, birthday');
      console.error('現在のヘッダー:', headers.join(', '));
      process.exit(1);
    }

    const members = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const raw = (key) => (row[headers[key]] != null ? String(row[headers[key]]).trim() : '');

      const name = idx.name >= 0 ? raw(idx.name) : '';
      const email = idx.email >= 0 ? raw(idx.email) : '';
      const birthday = idx.birthday >= 0 ? raw(idx.birthday) : '';

      if (!name || !email || !birthday) {
        console.warn(`行 ${i + 2} は氏名・メール・誕生日のいずれかが空のためスキップしました。`);
        continue;
      }

      const normalizedBirthday = normalizeDate(birthday);
      const birthdayHash = hashBirthday(normalizedBirthday || birthday);

      const paymentDate = idx.paymentDate >= 0 ? normalizeDate(raw(idx.paymentDate)) : '';
      let expiryDate = idx.expiryDate >= 0 ? normalizeDate(raw(idx.expiryDate)) : '';
      if (!expiryDate) {
        const y = new Date().getFullYear();
        expiryDate = `${y}-12-31`;
      }

      // 支払い状況がCSVに無いケース（シクミネット出力など）では、
      // 「ステータス」「退会日」「会員有効終了日」から会員資格を判定します。
      let paymentStatus = 'paid';
      const statusVal = idx.status >= 0 ? raw(idx.status) : '';
      const withdrawDateVal = idx.withdrawDate >= 0 ? raw(idx.withdrawDate) : '';
      const today = normalizeDate(new Date().toISOString().slice(0, 10));
      const activeByExpiry = expiryDate && expiryDate >= today;

      // 直接「支払い状況」列がある場合はそれを優先
      if (idx.paymentStatus >= 0) {
        const v = raw(idx.paymentStatus).toLowerCase();
        if (v === '未払い' || v === 'unpaid' || v === '未納' || v === '×') paymentStatus = 'unpaid';
        else if (v === '支払済' || v === 'paid' || v === '済' || v === '○') paymentStatus = 'paid';
      } else {
        // シクミネット想定: ステータスが「登録済み」等 かつ 退会日が空 かつ 有効期限が未来なら paid
        const okStatus = ['登録済み', '有効', '継続', 'active'].some((k) => String(statusVal).toLowerCase() === String(k).toLowerCase());
        if (!okStatus || withdrawDateVal) paymentStatus = 'unpaid';
        else if (!activeByExpiry) paymentStatus = 'unpaid';
        else paymentStatus = 'paid';
      }

      const memberNumber = idx.memberNumber >= 0 ? raw(idx.memberNumber) : `CL-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`;

      members.push({
        id: `member-${Date.now()}-${i}`,
        name,
        memberNumber,
        email: email.toLowerCase(),
        birthdayHash,
        paymentStatus,
        paymentDate: paymentDate || null,
        expiryDate,
        sikumiNetData: {
          memberId: memberNumber,
          lastSync: now,
        },
      });
    }

    await fs.writeFile(
      MEMBERS_FILE,
      JSON.stringify({ members }, null, 2),
      'utf8'
    );

    console.log(`取り込み完了: ${members.length} 件を ${MEMBERS_FILE} に保存しました。`);
    console.log('サーバーを再起動すると、新しい会員データでログインできます。');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`ファイルが見つかりません: ${absolutePath}`);
      console.error('シクミネットからダウンロードしたCSVを data/sikuminet.csv に保存するか、');
      console.error('次のようにパスを指定してください:');
      console.error('  node scripts/import-sikuminet-csv.js D:\\path\\to\\sikuminet.csv');
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

run();
