const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { MEMBERS_CSV_FILE, MEMBERS_FILE, MEMBERS_CSV_BASENAME, DATA_DIR } = require('./membersDataPath');
const { importSikuminetCsvFile } = require('./importSikuminetCsv');

const DEBOUNCE_MS = 500;

const log = {
  info: (msg) => console.log(`[会員CSV] ${msg}`),
  warn: (msg) => console.warn(`[会員CSV] ${msg}`),
  error: (msg) => console.error(`[会員CSV] ${msg}`),
};

let lastCsvMtimeMs = 0;
let debounceTimer = null;
let importing = false;
let pendingAgain = false;

function csvBasenameEquals(filename) {
  if (!filename) return false;
  return path.basename(filename) === MEMBERS_CSV_BASENAME;
}

async function importFromCsv(reason) {
  if (importing) {
    pendingAgain = true;
    return;
  }
  importing = true;
  try {
    let st;
    try {
      st = await fsPromises.stat(MEMBERS_CSV_FILE);
    } catch (e) {
      if (e.code === 'ENOENT') return;
      throw e;
    }
    if (st.mtimeMs <= lastCsvMtimeMs) return;

    const result = await importSikuminetCsvFile({
      csvPath: MEMBERS_CSV_FILE,
      logger: log,
    });
    lastCsvMtimeMs = (await fsPromises.stat(MEMBERS_CSV_FILE)).mtimeMs;
    log.info(
      `${reason}: ${result.importedCount}件を反映（スキップ ${result.skippedCount}）→ ${path.basename(MEMBERS_FILE)}`
    );
  } catch (e) {
    log.error(`取り込み失敗: ${e.message}`);
  } finally {
    importing = false;
    if (pendingAgain) {
      pendingAgain = false;
      setImmediate(() => scheduleImport('再試行'));
    }
  }
}

function scheduleImport(reason) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => importFromCsv(reason), DEBOUNCE_MS);
}

/**
 * 起動時: CSV が JSON より新しい（または JSON が無い）ときだけ取り込み。
 * lastCsvMtimeMs を最新の CSV mtime に合わせる。
 */
async function syncMembersCsvOnStartup() {
  try {
    const csvStat = await fsPromises.stat(MEMBERS_CSV_FILE);
    let jsonMtime = 0;
    try {
      jsonMtime = (await fsPromises.stat(MEMBERS_FILE)).mtimeMs;
    } catch (_) {
      /* JSON なし */
    }
    if (csvStat.mtimeMs > jsonMtime) {
      lastCsvMtimeMs = 0;
      await importFromCsv('起動時');
    } else {
      lastCsvMtimeMs = csvStat.mtimeMs;
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      log.info(`監視対象 CSV はまだありません（配置すると取り込みます）: data/${MEMBERS_CSV_BASENAME}`);
      lastCsvMtimeMs = 0;
    } else {
      log.error(`起動時チェック: ${e.message}`);
    }
  }
}

/**
 * data フォルダを監視し、対象 CSV の更新時に取り込み。
 * JSON 更新だけでは mtime が変わらないためループしない。
 * @returns {{ close: () => void }}
 */
function startMembersCsvWatch() {
  if (process.env.WATCH_MEMBERS_CSV === '0' || process.env.WATCH_MEMBERS_CSV === 'false') {
    log.info('WATCH_MEMBERS_CSV で監視を無効にしています');
    return { close: () => {} };
  }

  let watcher;
  try {
    watcher = fs.watch(DATA_DIR, (event, filename) => {
      if (filename != null && !csvBasenameEquals(filename)) return;
      scheduleImport('CSV変更');
    });
  } catch (e) {
    log.warn(`data フォルダの監視を開始できません: ${e.message}`);
    return { close: () => {} };
  }

  watcher.on('error', (err) => log.error(`監視エラー: ${err.message}`));

  log.info(`${MEMBERS_CSV_BASENAME} を監視中 → 保存すると ${path.basename(MEMBERS_FILE)} を更新します`);

  return {
    close: () => {
      clearTimeout(debounceTimer);
      if (watcher) watcher.close();
    },
  };
}

module.exports = { syncMembersCsvOnStartup, startMembersCsvWatch };
