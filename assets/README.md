# 美術素材資料夾 (`assets/`)

本資料夾存放遊戲使用的像素風格圖片素材（預設已內建 AI 生成的去背精靈圖與校慶操場背景）：

## 檔案對應表（可在 `js/config.js` 的 `CUSTOM_SPRITES` 自由替換）
- `bg_school_morning.png` — 清晨/烈日校慶操場視差背景（16:9）
- `bg_school_sunset.png` — 黃昏/壓軸校慶操場視差背景（16:9）
- `runner_1.png` — 第一棒・阿翔（面右透明 PNG）
- `runner_2.png` — 第二棒・小綠（面右透明 PNG）
- `runner_3.png` — 第三棒・大力（面右透明 PNG）
- `runner_4.png` — 第四棒・大庄健將（面右透明 PNG）
- `boss_1.png` — 第一棒 Boss：烏龍搶跑魔（面左透明 PNG）
- `boss_2.png` — 第二棒 Boss：亂丟飲料垃圾獸（面左透明 PNG）
- `boss_3.png` — 第三棒 Boss：彎道逆風颱風怪（面左透明 PNG）
- `boss_4.png` — 第四棒 Boss：抽筋大魔王（面左透明 PNG）
- `enemy_rhino.png` — 搶道插隊犀牛怪（面左透明 PNG）
- `enemy_dog.png` — 誤闖跑道的可愛校狗（面左透明 PNG）
- `enemy_phone.png` — 低頭滑手機橫越跑道的迷糊路人（面左透明 PNG）
- `enemy_balloon.png` — 亂丟石頭怪（面左透明 PNG）
- `pickup_weapon_W.png` / `pickup_weapon_D.png` / `pickup_weapon_M.png` / `pickup_weapon_B.png` — W 寶特瓶水柱 / D 躲避球 / M 大聲公音波砲 / B 樂樂棒球手榴彈武器箱（透明 PNG）
- `pickup_golden_baton.png` — 黃金接力棒秘密補給（透明 PNG）
- `food_sausage.png` / `food_boba.png` / `food_chicken.png` — 園遊會攤位美食：大腸包小腸 / 珍奶 / 香雞排（透明 PNG）
- `captive_student.png` / `captive_teacher.png` — 被器材壓住的同學 / 抽筋倒在路邊的老師（透明 PNG）
- `pickup_drink.png` / `pickup_jelly.png` / `pickup_spikes.png` — 運動飲料 / 能量果凍 / 防滑釘鞋補給品（透明 PNG）
- `trap_puddle.png` / `trap_shoelace.png` / `trap_hurdle.png` / `trap_cone.png` / `trap_sandpit.png` — 積水坑 / 跑道小石頭 / 跨欄架 / 三角錐 / 跳遠沙坑（透明 PNG）
- `ground_violet_track.png` — 紫色跑道與磚塊剖面地磚（透明 PNG）
- `sheet_runner_1.png` ～ `sheet_runner_4.png` — 四棒主角多格動作精靈表（跑／跳／射／衝／受傷，自動切格與腳底對齊）
- `ui_warning.png` / `ui_clear.png` — 魔王警告標章與破關冠軍獎盃圖示（透明 PNG）
- `font-Cubic_11.woff2` — 繁體中文點陣像素字體（Cubic 11）

若您想替換為自製 PNG/GIF 角色圖，只要將圖片覆蓋同名檔案（或更新 `js/config.js` 的 `CUSTOM_SPRITES` 路徑）即可立即套用！
