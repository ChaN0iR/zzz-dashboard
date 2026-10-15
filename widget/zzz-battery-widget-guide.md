# 絕區零電量小工具：iPhone 設定教學

這個小工具會顯示你的真實電量（目前 / 240）和滿電倒數，兩次更新之間每 6 分鐘加 1 來估算，點一下會打開儀表板。

## 先看這個：安全提醒

- 你要提供的 `ltuid_v2` 和 `ltoken_v2` 是 HoYoLAB 的登入憑證，拿到的人可以用你的 HoYoLAB 帳號查資料，所以不要貼到任何公開的地方、不要截圖、不要傳給別人（包含 GitHub、聊天群）。
- 憑證只會存在你 iPhone 的鑰匙圈，腳本檔案裡沒有任何帳號資料。
- 如果懷疑外洩：到 HoYoLAB 登出所有裝置或改密碼，舊憑證就會失效。
- 這個做法使用非官方的 HoYoLAB 介面，官方隨時可能調整，所以有可能哪天突然失效。

## 步驟 1：安裝 Scriptable

1. 在 iPhone 的 App Store 搜尋「Scriptable」，安裝（免費）。

## 步驟 2：建立腳本

1. 在電腦或手機打開：https://raw.githubusercontent.com/ChaN0iR/zzz-dashboard/main/widget/zzz-battery-widget.js
2. 全選、複製整份程式碼。
3. 打開 Scriptable，點右上角「+」新增腳本，貼上全部內容。
4. 點左上角名稱，改成「絕區零電量」，點完成。
5. 找到最上方的 `CONFIG`，把 `UID: "YOUR_ZZZ_UID"` 改成你的絕區零 UID（只改引號裡的數字，保留引號）。

## 步驟 3：取得 ltuid_v2 和 ltoken_v2（用電腦）

iPhone 的 Safari 沒辦法直接看 cookie，所以最實際的做法是用電腦瀏覽器。`ltoken_v2` 通常是受保護的 cookie，網頁上的書籤小程式讀不到，所以不建議用書籤的方式，請用開發者工具：

用 Chrome（Edge 也一樣）：
1. 在電腦打開 https://www.hoyolab.com 並登入。
2. 按 F12（Mac 是 Option + Command + I）打開開發者工具。
3. 點上方的「Application（應用程式）」分頁。如果看不到，點 `>>` 展開。
4. 左側展開「Cookies」，點選 `https://www.hoyolab.com`。
5. 在列表中找到 `ltuid_v2` 和 `ltoken_v2`，分別點一下，下方會顯示完整的值，複製起來。如果有 `ltmid_v2` 也一起複製（選填，部分情況會需要）。

用 Safari（Mac）：需要先到 Safari 設定 → 進階，勾選「在選單列中顯示開發選單」，再用「開發 → 顯示網頁檢閱器 → 儲存空間 → Cookie」找到同樣的欄位。

## 步驟 4：把憑證安全地傳到 iPhone

最簡單的方式是用 Apple 的通用剪貼簿：電腦是 Mac 且 iPhone 登入同一個 Apple 帳號時，在 Mac 複製，直接在 iPhone 貼上即可，不會經過網路上的第三方。

一次一個：
1. 在 Mac 複製 `ltuid_v2` 的值。
2. 在 iPhone 的 Scriptable 彈窗中貼到對應欄位。ltoken_v2 同樣處理。

如果沒有 Mac：可用 AirDrop 傳一則文字，或存到「備忘錄」，貼完之後馬上刪除該備忘錄（並到「最近刪除」清空）。不要用 LINE、Email 或雲端文件傳。

## 步驟 5：第一次執行

1. 在 Scriptable 點你的腳本（輕點腳本卡片即執行）。
2. 選「設定憑證」，貼上 `ltuid_v2`、`ltoken_v2`（ltmid_v2 可不填），按「儲存」。
3. 再執行一次，選「預覽中型小工具」，看到電量數字就成功了。

## 步驟 6：開啟 HoYoLAB 的即時便箋

如果顯示「請在 HoYoLAB 開啟即時便箋」：用手機打開 HoYoLAB App → 戰績 → 絕區零 → 右上角設定，把「即時便箋」打開。

## 步驟 7：加到主畫面

1. 長按 iPhone 主畫面空白處，點左上角「+」。
2. 搜尋並選「Scriptable」，選小型或中型，按「加入小工具」。
3. 長按該小工具 → 編輯小工具，「Script」選「絕區零電量」。其他選項保持預設。
4. 點小工具會打開儀表板：https://chan0ir.github.io/zzz-dashboard/

小工具大約每 15 分鐘更新一次，但 iOS 有最後決定權，實際可能更久。更新之間會用每 6 分鐘 +1 估算，右上角會顯示「即時」或「估算」。

## 疑難排解

| 狀況 | 處理 |
| --- | --- |
| 顯示「尚未設定」 | 在 Scriptable 內執行腳本，選「設定憑證」 |
| 顯示「請先在腳本 CONFIG 填入 UID」 | 步驟 2 的第 5 點 |
| 顯示「憑證失效，請重新設定」 | 重新登入 HoYoLAB，重新取得兩個值再設定。cookie 過期或你改過密碼就會這樣 |
| 顯示「請在 HoYoLAB 開啟即時便箋」 | 步驟 6 |
| 顯示「需要驗證，請稍後再試」 | 打開 HoYoLAB App 的戰績頁看一下，過一陣子再試 |
| 顯示「快取」 | 網路失敗，目前是依上次成功的讀數估算，數字仍會往上加 |
| 顯示「錯誤 xxxx」 | 把錯誤數字告訴我，不要附上憑證 |
| 小工具一直不更新 | iOS 會依使用習慣決定頻率，打開 Scriptable 執行一次，或開啟省電模式以外的設定 |

要移除憑證：在 Scriptable 執行腳本，選「清除憑證與快取」。

## 哪些部分我驗證過

- 驗證過：腳本語法、MD5 與 DS 簽章演算法（與標準 MD5 對照一致）、估算與顯示邏輯、錯誤處理流程。
- 沒驗證：實際連上 HoYoLAB 取電量。因為需要你的真實憑證，我沒有也不會取得。API 位址和標頭是依開源專案 genshin.py 的原始碼寫的，第一次在你手機上執行才能確認。如果出現錯誤代碼，把代碼告訴我就能調整。


## 開啟遊戲（選用）

絕區零沒有查得到的官方 URL scheme（先前用的 `zenlesszonezero://` 是推測，已移除）。已確認的資料：App 的 bundle id 是 `com.HoYoverse.Nap`，通用連結是 https://oig.hoyoverse.com/zenlessglobal/（已安裝會開 App，沒裝會到 App Store）。

最穩的做法是建立 iOS 捷徑：
1. 開啟「捷徑」App → 新增捷徑。
2. 加入動作「打開 App」→ 選「絕區零」。
3. 命名為「打開絕區零」。
   或直接加入現成捷徑：https://www.icloud.com/shortcuts/7e11547991bd4962808b3396c724c63f

儀表板的 LOGO 與右上「開啟遊戲」預設會執行 `shortcuts://run-shortcut?name=打開絕區零`。到儀表板「設定」可改捷徑名稱，或改用「通用連結」「自訂連結」。若沒開成功，1.5 秒後會顯示建立捷徑的步驟與「試通用連結」「前往 App Store」按鈕。

小工具：把腳本 CONFIG 的 `OPEN_GAME_ON_TAP` 改成 `true`，點小工具就會開遊戲（預設是開儀表板）。預設用 `SHORTCUT_NAME` 的捷徑；`GAME_URL` 填了就改用該連結。

## 儀表板「留空更新」同步真實電量

儀表板最上方「遊戲裡現在的電量」留空、按「更新」，會切到 Scriptable 向 HoYoLAB 讀取真實電量，完成後自動回到儀表板並顯示「已從 HoYoLAB 同步為 N/240」。只能在 iPhone 使用，電腦會提示手動輸入。

### 你需要重新複製一次腳本（舊版沒有這個功能）

1. 在 iPhone 的 Safari 打開：https://raw.githubusercontent.com/ChaN0iR/zzz-dashboard/main/widget/zzz-battery-widget.js
2. 長按頁面文字，選「全選」，再按「拷貝」。
3. 打開 Scriptable，點開原本的「絕區零電量」腳本。
4. 在程式碼區長按，選「全選」，再選「貼上」，蓋掉舊的內容。
5. 找到最上方的 `YOUR_ZZZ_UID`，再填一次你的 UID（因為貼上的是空白版本），引號要留著。
6. 腳本名稱保持「絕區零電量」不要改。如果你改了名字，到儀表板右上「設定」的「Scriptable 腳本名稱」填一樣的名稱。

### 運作方式與安全

- 儀表板用 `scriptable:///run/絕區零電量?sync=1&return=...` 開啟腳本；腳本用鑰匙圈裡的憑證讀取電量，再用 Safari 開 `儀表板網址?battery=數字&at=時間&max=240`。憑證不會離開手機，網址裡只有電量與時間。
- 腳本只會回到 `https://chan0ir.github.io/zzz-dashboard/` 開頭的網址。
- 失敗時回到 `?batteryError=代碼`，儀表板會顯示中文原因（憑證失效、需開啟即時便箋、需要驗證、連線失敗等）。
- 儀表板只接受 0 到 240 的整數，且時間不能比現在晚超過 1 分鐘，不符就拒絕並顯示原因。
- 同步時 Scriptable 會短暫跳出來、再跳回 Safari，這是 iOS 的正常行為。
- 尚未在真實 iPhone 驗證。若切到 Scriptable 後停住或沒有跳回，請截圖給我。
