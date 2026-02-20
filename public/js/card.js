// ページ読み込み時に会員情報を取得
document.addEventListener('DOMContentLoaded', async () => {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    try {
        // セッション確認
        const authCheck = await fetch('/api/auth/check');
        const authData = await authCheck.json();

        if (!authData.authenticated) {
            window.location.href = '/';
            return;
        }

        // 会員情報を取得
        const response = await fetch('/api/members/info');
        const memberData = await response.json();

        if (response.ok) {
            // 会員情報を表示
            document.getElementById('memberName').textContent = memberData.name || '-';
            document.getElementById('memberNumber').textContent = memberData.memberNumber || '-';
            document.getElementById('memberType').textContent = memberData.memberType || '-';
            document.getElementById('expiryDate').textContent = formatDate(memberData.expiryDate) || '-';
            
            // 支払い状況
            const paymentStatusEl = document.getElementById('paymentStatus');
            paymentStatusEl.textContent = memberData.paymentStatus === 'paid' ? '支払済み' : '未払い';
            paymentStatusEl.className = 'value payment-status ' + memberData.paymentStatus;

            loadingMessage.style.display = 'none';
        } else {
            throw new Error(memberData.error || '会員情報の取得に失敗しました');
        }
    } catch (error) {
        loadingMessage.style.display = 'none';
        errorMessage.textContent = error.message || 'エラーが発生しました';
        errorMessage.style.display = 'block';
        console.error('Error:', error);
    }
});

// ログアウト処理
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
        });

        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // エラーが発生してもリダイレクト
        window.location.href = '/';
    }
});

// 印刷処理
document.getElementById('printBtn').addEventListener('click', () => {
    window.print();
});

// 日付フォーマット
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString + 'T00:00:00');
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}年${month}月${day}日`;
}
