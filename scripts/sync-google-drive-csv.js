const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { spawnSync } = require('child_process');

// .env をプロジェクトルートから確実に読み込む
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Google Drive 上のCSVをダウンロードして、members.json を更新するスクリプト
 *
 * 事前準備（概要）:
 * - Google Cloudでサービスアカウント作成 & Drive API有効化
 * - サービスアカウント鍵(JSON)を用意（例: google-service-account.json）
 * - Drive上のCSVファイル（または格納フォルダ）をサービスアカウントに共有
 *
 * 使い方:
 * 1) .env に設定:
 *    GOOGLE_SERVICE_ACCOUNT_KEY_FILE=D:\tomoh\Documents\vsc\google-service-account.json
 *    GOOGLE_DRIVE_FILE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * 2) 実行:
 *    node scripts/sync-google-drive-csv.js
 *
 * 取り込んだCSVは data/sikuminet.csv に保存し、
 * scripts/import-sikuminet-csv.js で members.json に変換します。
 */

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const DEST_CSV = path.join(DATA_DIR, 'sikuminet.csv');

async function downloadDriveFileAsText(drive, fileId) {
  // Driveに「CSVファイル」をそのまま置いている場合（推奨）
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  );
  return res.data;
}

async function run() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;

  if (!keyFile || !fileId) {
    console.error('必要な環境変数が不足しています。');
    console.error('  GOOGLE_SERVICE_ACCOUNT_KEY_FILE');
    console.error('  GOOGLE_DRIVE_FILE_ID');
    process.exit(1);
  }

  // 鍵ファイルが「ファイル」として存在するか確認（フォルダだと EISDIR になる）
  const keyPath = path.isAbsolute(keyFile) ? keyFile : path.join(PROJECT_ROOT, keyFile);
  try {
    const stat = await fs.stat(keyPath);
    if (!stat.isFile()) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY_FILE はファイルを指してください。現在、フォルダを指しています:');
      console.error('  ' + keyPath);
      process.exit(1);
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.error('鍵ファイルが見つかりません:');
      console.error('  ' + keyPath);
      console.error('Google Cloud でダウンロードした JSON 鍵を、上記のパスに置いてください。');
    } else {
      console.error('鍵ファイルの確認でエラー:', e.message);
    }
    process.exit(1);
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  console.log('Google Drive からCSVをダウンロードします...');
  const csvText = await downloadDriveFileAsText(drive, fileId);

  if (!csvText || String(csvText).trim().length === 0) {
    console.error('CSVの内容が空でした。Drive上のファイルを確認してください。');
    process.exit(1);
  }

  await fs.writeFile(DEST_CSV, csvText, 'utf8');
  console.log(`保存しました: ${DEST_CSV}`);

  console.log('CSVを取り込んで members.json を更新します...');
  const r = spawnSync(
    process.execPath,
    [path.join(PROJECT_ROOT, 'scripts', 'import-sikuminet-csv.js'), DEST_CSV],
    { stdio: 'inherit' }
  );

  process.exit(r.status ?? 0);
}

run().catch((e) => {
  console.error('同期エラー:', e?.message || e);
  process.exit(1);
});

