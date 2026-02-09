from flask import Flask, jsonify
from flask_cors import CORS
import requests
import json
import time
import random
import re
import os
from dotenv import load_dotenv
load_dotenv()
APP_ID = os.getenv("RAKUTEN_APP_ID")

app = Flask(__name__)
# ブラウザ(JS)からのリクエストを許可
CORS(app)

# --- 設定項目 ---
CAT_MEAT = "31"
CAT_FISH = "32"
SIDE_CAT_POOL = ["12", "33", "35", "12", "33"]

# --- レシピ取得ロジック ---

def get_recipe_safe(category_id, used_ids):
    """API制限(1秒1回)を考慮してレシピを取得"""
    time.sleep(1.5)  # 楽天APIへの負荷を抑えるための待機
    url = f"https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426?applicationId={APP_ID}&categoryId={category_id}"
    
    try:
        res = requests.get(url, timeout=10)
        if res.status_code != 200:
            return None
        
        data = res.json()
        candidates = data.get('result', [])
        
        # 重複を避けてランダムに1つ選ぶ
        random.shuffle(candidates)
        for recipe in candidates:
            if recipe['recipeId'] not in used_ids:
                used_ids.add(recipe['recipeId'])
                return recipe
        return candidates[0] if candidates else None
    except Exception as e:
        print(f"Error fetching recipe: {e}")
        return None

def clean_material_only(raw_materials):
    """材料リストを文字列の配列に整形"""
    material_names = []
    for item in raw_materials:
        # 不要な記号を削除
        clean_name = re.sub(r'[★☆●◎▲■❏＜＞・]', '', item).strip()
        if clean_name:
            material_names.append(clean_name)
    return material_names

# --- Flask ルーティング (JSからの出口) ---

@app.route('/generate', methods=['GET'])
def api_generate():
    print("献立生成リクエストを受信しました...")
    
    used_recipe_ids = set()
    weekly_menu = []
    fish_day_index = random.randint(0, 4)
    
    # カテゴリのシャッフル
    current_side_cats = SIDE_CAT_POOL.copy()
    random.shuffle(current_side_cats)

    # 5日分のデータを取得
    for i in range(5):
        main_cat = CAT_FISH if i == fish_day_index else CAT_MEAT
        side_cat = current_side_cats[i]
        
        main_rec = get_recipe_safe(main_cat, used_recipe_ids)
        side_rec = get_recipe_safe(side_cat, used_recipe_ids)

        if main_rec and side_rec:
            weekly_menu.append({
                "day": i + 1,
                "main": {
                    "name": main_rec['recipeTitle'],
                    "url": main_rec['recipeUrl'],
                    "ingredients": clean_material_only(main_rec['recipeMaterial'])
                },
                "side": {
                    "name": side_rec['recipeTitle'],
                    "url": side_rec['recipeUrl'],
                    "ingredients": clean_material_only(side_rec['recipeMaterial'])
                }
            })
            print(f"Day {i+1} 取得完了")

    if not weekly_menu:
        return jsonify({"error": "レシピの取得に失敗しました。少し時間を置いてください。"}), 500

    return jsonify(weekly_menu)

if __name__ == '__main__':
    print("Pythonサーバーを起動しました。ポート番号: 5000")
    app.run(debug=True, port=5000)