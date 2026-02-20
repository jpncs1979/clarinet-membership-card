const fs = require('fs').promises;
const path = require('path');

const MEMBERS_FILE = path.join(__dirname, '..', 'data', 'members.json');

/**
 * シクミネットから会員情報を同期するスクリプト
 * 
 * 使用方法:
 * 1. シクミネットのAPI仕様に合わせて実装を調整
 * 2. 定期実行（cron等）で会員情報を更新
 * 
 * 例: node scripts/sync-sikuminet.js
 */

async function loadMembers() {
  try {
    const data = await fs.readFile(MEMBERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { members: [] };
  }
}

async function saveMembers(data) {
  await fs.writeFile(MEMBERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * シクミネットAPIから会員情報を取得
 * TODO: 実際のシクミネットAPIに合わせて実装
 */
async function fetchSikumiNetData(sikumiNetId) {
  // ここにシクミネットのAPI呼び出しを実装
  // 例:
  // const response = await fetch(`https://api.sikuminet.com/members/${sikumiNetId}`);
  // return await response.json();
  
  // モックデータ
  return {
    paymentStatus: 'paid',
    paymentDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date().getFullYear() + '-12-31'
  };
}

/**
 * 会員情報をシクミネットのデータで更新
 */
async function syncSikumiNet() {
  try {
    console.log('シクミネットとの同期を開始します...');
    
    const data = await loadMembers();
    const members = data.members || [];
    
    let updatedCount = 0;
    
    for (const member of members) {
      if (member.sikumiNetData && member.sikumiNetData.memberId) {
        try {
          // シクミネットから最新情報を取得
          const sikumiData = await fetchSikumiNetData(member.sikumiNetData.memberId);
          
          // 会員情報を更新
          member.paymentStatus = sikumiData.paymentStatus || member.paymentStatus;
          member.paymentDate = sikumiData.paymentDate || member.paymentDate;
          member.expiryDate = sikumiData.expiryDate || member.expiryDate;
          member.sikumiNetData.lastSync = new Date().toISOString();
          
          updatedCount++;
          console.log(`✓ ${member.name} (${member.memberNumber}) を更新しました`);
          
          // APIレート制限対策（必要に応じて）
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`✗ ${member.name} の更新に失敗:`, error.message);
        }
      }
    }
    
    await saveMembers(data);
    
    console.log(`\n同期完了: ${updatedCount}件の会員情報を更新しました`);
    
  } catch (error) {
    console.error('同期エラー:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  syncSikumiNet();
}

module.exports = { syncSikumiNet };
