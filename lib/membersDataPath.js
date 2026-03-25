const path = require('path');

/** 会員データ JSON（data フォルダ内のファイル名） */
const MEMBERS_JSON_BASENAME = 'members_20260325_083443.json';

/** 会員マスタ CSV（このファイルを更新すると JSON に自動取り込み） */
const MEMBERS_CSV_BASENAME = 'members_20260325_083443.csv';

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMBERS_FILE = path.join(DATA_DIR, MEMBERS_JSON_BASENAME);
const MEMBERS_CSV_FILE = path.join(DATA_DIR, MEMBERS_CSV_BASENAME);

module.exports = {
  MEMBERS_JSON_BASENAME,
  MEMBERS_CSV_BASENAME,
  MEMBERS_FILE,
  MEMBERS_CSV_FILE,
  DATA_DIR,
};
