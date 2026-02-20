const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { importSikuminetCsvFile } = require('./importSikuminetCsv');

/**
 * Google Drive からCSVをダウンロードして、members.json を更新する
 * サーバー起動中に自動で実行される
 */
async function syncFromGoogleDrive() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY; // Render等で環境変数として設定する場合
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;

  // 環境変数が設定されていない場合はスキップ（手動CSV使用時）
  if ((!keyFile && !keyJson) || !fileId) {
    return { success: false, reason: '環境変数が設定されていません' };
  }

  const PROJECT_ROOT = path.join(__dirname, '..');
  const DATA_DIR = path.join(PROJECT_ROOT, 'data');
  const DEST_CSV = path.join(DATA_DIR, 'sikuminet.csv');

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    // 認証情報の準備
    let authConfig;
    if (keyJson) {
      // 環境変数からJSON鍵を読み込む（Render等で使用）
      try {
        const credentials = JSON.parse(keyJson);
        authConfig = {
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        };
      } catch (e) {
        return { success: false, reason: 'GOOGLE_SERVICE_ACCOUNT_KEY のJSONが無効です' };
      }
    } else {
      // ファイルから鍵を読み込む（ローカル開発時）
      const keyPath = path.isAbsolute(keyFile) ? keyFile : path.join(PROJECT_ROOT, keyFile);
      try {
        const stat = await fs.stat(keyPath);
        if (!stat.isFile()) {
          return { success: false, reason: '鍵ファイルがフォルダです' };
        }
      } catch (e) {
        if (e.code === 'ENOENT') {
          return { success: false, reason: '鍵ファイルが見つかりません' };
        }
        throw e;
      }
      authConfig = {
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      };
    }

    // Google Drive API でCSVをダウンロード
    const auth = new google.auth.GoogleAuth(authConfig);
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );
    const csvText = res.data;

    if (!csvText || String(csvText).trim().length === 0) {
      return { success: false, reason: 'CSVの内容が空です' };
    }

    // CSVを保存
    await fs.writeFile(DEST_CSV, csvText, 'utf8');

    // CSVを取り込んで members.json を更新
    const result = await importSikuminetCsvFile({
      csvPath: DEST_CSV,
      logger: {
        info: (msg) => console.log(`[Drive同期] ${msg}`),
        warn: (msg) => console.warn(`[Drive同期] ${msg}`),
        error: (msg) => console.error(`[Drive同期] ${msg}`),
      },
    });

    return {
      success: true,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      reason: error.message || String(error),
      error: error,
    };
  }
}

module.exports = { syncFromGoogleDrive };
