# 作品站後台（Admin）技術方案

> 起因：2026-10-07，cristi 決定把站放到自己的 Ubuntu VPS，並想自己寫一個後台方便管理。
> 目標：以後加作品、換圖、改文案，不用再手改 `js/data.js`、不用手動丟檔案進 `assets/img/`。

## 1. 現況盤點（以 repo 實測為準）

- 純靜態站：`index.html` + `css/` + `js/data.js|effects.js|main.js` + `assets/img/`
- 數據層全部在 `js/data.js`，掛 `window.PF`：
  - `PF.WORKS`：12 件作品，欄位 `id / cat(photo|design) / title / titleEn / year / tags[] / img / palette / desc`
  - `PF.SKILLS`：6 項技能，欄位 `id / name / level(0-100)`
- 約束：classic `<script>` 引入，**禁止 ES module**（data.js 檔頭註明）
- 待填的坑：About 肖像還是「待提供」佔位（`assets/img/portrait.jpg` 缺失）；聯繫區社交連結是 `#` 佔位
- 已部署：GitHub Pages（`2ndforcecrew/cristi-portfolio`，主線）；Vercel 已暫停

## 2. 架構決策

```
瀏覽者 → Caddy(:80/:443, 自動 HTTPS) → 靜態檔案 (index.html/css/js/assets)
管理員 → https://你的域名/admin → Caddy 反代 → 後台進程 (127.0.0.1:3000)
```

- **前端保持純靜態、零改動**：後台把資料寫成 JSON 存檔，再**重新生成 `js/data.js`**（保持 `window.PF` 格式與現有欄位），前端程式一行不動。
- **VPS 變成主寫入源**：以後改東西只在 VPS 後台改；GitHub Pages 留作鏡像/備援（注意：兩邊不會自動同步，選一邊為主）。
- 後台只聽 `127.0.0.1`，對外只經 Caddy；`/admin` 路徑可再加一層 Caddy basic_auth。

## 3. 資料模型（後台的 single source of truth）

```
/srv/portfolio/data/works.json   ← PF.WORKS 的 JSON 版（後台唯一寫入）
/srv/portfolio/data/site.json    ← { about: {lead, paras[], stats[]}, skills[], social{}, portrait }
/srv/portfolio/assets/img/       ← 上傳圖片（沿用現有命名習慣 photo-XX / design-XX）
js/data.js                       ← 由後台從上面兩個 JSON 重新生成（生成器，不是手寫）
```

## 4. 後台 API（MVP）

技術選型二選一（都夠用，看你順手）：

- **A. Node.js + Express**（推薦：跟前端同語言，`sharp` 做縮圖最省事）
- B. Python + FastAPI（你寫過 Python CLI，也熟；縮圖用 Pillow）

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/login` | 密碼登入（密碼放 env `ADMIN_PASS`，httpOnly session cookie） |
| GET | `/api/works` | 作品列表 |
| POST | `/api/works` | 新增作品（欄位同 PF.WORKS，不含 img） |
| PUT | `/api/works/:id` | 編輯作品 |
| DELETE | `/api/works/:id` | 刪除作品（可選連圖一起刪） |
| POST | `/api/works/:id/image` | 上傳圖片（multipart，白名單 jpg/png/webp，限 20MB，存 `assets/img/` 並回寫 `img` 路徑） |
| POST | `/api/works/reorder` | 拖拽排序（收 `id[]` 順序） |
| GET/PUT | `/api/site` | About 文案 / 數字統計 / 技能 / 社交連結 / 肖像上傳 |
| POST | `/api/publish` | 從 JSON 重新生成 `js/data.js`（或每次寫入自動觸發，省掉這步） |

## 5. 後台頁面（單頁 `/admin`，夠用就好）

1. 登入（一個密碼框）
2. 作品管理：列表（縮圖+標題+分類）→ 新增/編輯表單（中英標題、年份、tags、色票、描述、分類）→ 圖片上傳 → 刪除 → 拖拽排序
3. 內容管理：About 文案三段、統計數字、6 項技能、社交連結、肖像上傳（順手把「待提供」填上）
4. 儲存後即時重新生成 `js/data.js`，前台刷新可見

## 6. VPS 部署（Ubuntu）

```caddyfile
# /etc/caddy/Caddyfile
你的域名 {
    root * /srv/portfolio
    file_server
    handle /admin* {
        reverse_proxy 127.0.0.1:3000
    }
}
```

- 後台做成 systemd service，開機自啟：`/etc/systemd/system/portfolio-admin.service`
- ufw 只開 22/80/443；後台進程不對外監聽
- 上傳目錄給寫權限，Caddy 只做 `file_server`（不執行任何腳本，上傳目錄天然不可執行）

## 7. 安全基線（個人站，抓大放小）

- 管理密碼只放環境變數，不進 repo
- session cookie：httpOnly + Secure + SameSite=Lax
- 上傳：副檔名/MIME 雙白名單、大小上限、隨機檔名（保留原副檔名）
- `/admin` 可選再套 Caddy `basic_auth` 做第二道門

## 8. 非目標（MVP 不做）

多用戶權限、在線圖片裁剪/修圖、版本歷史（真想要可順手 `git commit` 一下，反正目錄已有 `.git`）。

## 9. 驗收標準

1. 後台上傳一張圖 → 新增一件作品 → 前台首屏畫廊立刻出現
2. 改標題/tags → `js/data.js` 對應更新，前端效果不變（sticky 畫廊、viewer 照常）
3. 重啟 VPS 後資料都在，`systemctl is-active` 正常

## 附：不想自己運維進程的替代方案

如果哪天覺得維護 Node 進程麻煩，Decap CMS（git-based、無後端，`/admin` 純前端、提交直接進 GitHub）是零運維替代——但那就不是「自己寫後台」了，先按上面的來。
