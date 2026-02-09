/**
 * 1週間献立マネージャー - フロントエンド制御
 */

const generateBtn = document.getElementById('generate-btn');
const menuDiv = document.getElementById('weekly-menu');
const shopUl = document.getElementById('shopping-list');

// FlaskサーバーのURL（ローカル実行）
const API_URL = 'http://127.0.0.1:5000/generate';

/**
 * ボタンクリック時のイベント
 */
generateBtn.addEventListener('click', async () => {
    // 1. UIの初期化とローディング状態の設定
    setLoading(true);
    menuDiv.innerHTML = '<p class="status-msg">最新の献立を生成中...（約15〜20秒かかります）</p>';
    shopUl.innerHTML = '<li>生成を待っています...</li>';

    try {
        // 2. Pythonサーバー（Flask）へリクエスト送信
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error('サーバーとの通信に失敗しました。Python側を確認してください。');
        }

        const recipes = await response.json();

        if (recipes.error) {
            throw new Error(recipes.error);
        }

        // 3. 取得したデータを画面に描画
        renderMenuAndShoppingList(recipes);

    } catch (error) {
        console.error("生成エラー:", error);
        menuDiv.innerHTML = `<p style="color: red;">エラーが発生しました: ${error.message}</p>`;
        shopUl.innerHTML = '<li>エラーのため表示できません。</li>';
    } finally {
        // 4. ローディング状態の解除
        setLoading(false);
    }
});

/**
 * ローディング中のボタン表示制御
 */
function setLoading(isLoading) {
    if (isLoading) {
        generateBtn.disabled = true;
        generateBtn.innerText = "作成中...";
        generateBtn.style.opacity = "0.6";
        generateBtn.style.cursor = "not-allowed";
    } else {
        generateBtn.disabled = false;
        generateBtn.innerText = "1週間分を作成する";
        generateBtn.style.opacity = "1";
        generateBtn.style.cursor = "pointer";
    }
}

/**
 * 献立カードと買い物リストの描画処理
 */
function renderMenuAndShoppingList(recipes) {
    // 表示エリアをクリア
    menuDiv.innerHTML = "";
    shopUl.innerHTML = "";

    // 材料を重複なく保存するための Set
    let shoppingSet = new Set(); 

    recipes.forEach(day => {
        // --- 献立カードの作成 ---
        const card = document.createElement('div');
        card.className = 'day-card';
        card.innerHTML = `
            <div class="day-label">Day ${day.day}</div>
            <h3>主菜: <a href="${day.main.url}" target="_blank">${day.main.name}</a></h3>
            <p>副菜: <a href="${day.side.url}" target="_blank">${day.side.name}</a></p>
        `;
        menuDiv.appendChild(card);

        // --- 材料をセットに追加 ---
        day.main.ingredients.forEach(ing => shoppingSet.add(ing));
        day.side.ingredients.forEach(ing => shoppingSet.add(ing));
    });

    // --- 買い物リストの表示（ソートして出力） ---
    const sortedList = Array.from(shoppingSet).sort();

    if (sortedList.length === 0) {
        shopUl.innerHTML = "<li>材料データが見つかりませんでした。</li>";
        return;
    }

    sortedList.forEach(itemName => {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" id="item-${itemName}">
            <label for="item-${itemName}">${itemName}</label>
        `;
        shopUl.appendChild(li);
    });
}