// ログインフォーム処理
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const birthday = document.getElementById('birthday').value;
    const errorMessage = document.getElementById('errorMessage');

    // エラーメッセージをクリア
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, birthday }),
        });

        const data = await response.json();

        if (response.ok) {
            // ログイン成功 - 会員証ページにリダイレクト
            window.location.href = '/card';
        } else {
            // エラー表示
            errorMessage.textContent = data.error || 'ログインに失敗しました';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'ネットワークエラーが発生しました';
        errorMessage.style.display = 'block';
        console.error('Error:', error);
    }
});

