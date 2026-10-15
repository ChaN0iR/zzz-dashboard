// 絕區零 電量小工具 (Scriptable)
// 顯示：目前電量 / 240、滿電倒數，兩次更新之間每 6 分鐘 +1 估算。
// 點擊小工具會開啟儀表板。
// 儀表板「遊戲裡現在的電量」留空按「更新」，會用 scriptable:///run/...?sync=1 呼叫本腳本，
// 取得真實電量後再用 Safari 開回儀表板（只允許回到下方 DASHBOARD_URL）。
// 憑證只存在 iOS 鑰匙圈 (Keychain)，此檔案內不含任何帳號資料，可安心備份。

// ===================== CONFIG（只需要改這裡）=====================
const CONFIG = {
  UID: "YOUR_ZZZ_UID",          // 改成你的絕區零 UID（純數字，字串即可）
  SERVER: "prod_gf_sg",         // 台港澳服 = prod_gf_sg
  DASHBOARD_URL: "https://chan0ir.github.io/zzz-dashboard/",
  MAX: 240,
  SECONDS_PER_POINT: 360,       // 每 6 分鐘恢復 1 點
  REFRESH_MINUTES: 15,
  STALE_MINUTES: 45,            // 超過此時間沒成功連線，就標示「估算」
  OPEN_GAME_ON_TAP: false,      // true = 點小工具直接開啟遊戲（預設開儀表板）
  GAME_SCHEME: "zenlesszonezero://" // 推測值，未經驗證；打不開請改成正確的 scheme
};
// ================================================================

const KEY_UID = "zzz_ltuid_v2";
const KEY_TOKEN = "zzz_ltoken_v2";
const KEY_MID = "zzz_ltmid_v2";
const API = "https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz/note";
// 海外版 DS 動態密鑰 salt（來自開源專案 genshin.py）
const DS_SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";

// ---------- 純 JS MD5 ----------
function md5(str) {
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function add(x, y) {
    const l = (x & 0xffff) + (y & 0xffff);
    return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xffff);
  }
  const K = [], S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  const bytes = [];
  const u = unescape(encodeURIComponent(str));
  for (let i = 0; i < u.length; i++) bytes.push(u.charCodeAt(i));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bitLen >>> (8 * i)) & 0xff : 0);
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (let o = 0; o < bytes.length; o += 64) {
    const M = [];
    for (let i = 0; i < 16; i++)
      M[i] = bytes[o+i*4] | (bytes[o+i*4+1] << 8) | (bytes[o+i*4+2] << 16) | (bytes[o+i*4+3] << 24);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = add(add(F, A), add(K[i], M[g]));
      A = D; D = C; C = B;
      B = add(B, rl(F, S[i]));
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D);
  }
  let out = "";
  [a0, b0, c0, d0].forEach(v => {
    for (let i = 0; i < 4; i++) out += ("0" + ((v >>> (8 * i)) & 0xff).toString(16)).slice(-2);
  });
  return out;
}

function makeDS() {
  const t = Math.floor(Date.now() / 1000);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let r = "";
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const h = md5("salt=" + DS_SALT + "&t=" + t + "&r=" + r);
  return t + "," + r + "," + h;
}

// ---------- 憑證 ----------
function hasCreds() { return Keychain.contains(KEY_UID) && Keychain.contains(KEY_TOKEN); }

async function promptCreds() {
  const a = new Alert();
  a.title = "設定 HoYoLAB 憑證";
  a.message = "請貼上 ltuid_v2 與 ltoken_v2。這些會存在 iPhone 鑰匙圈，請勿分享給任何人。（ltmid_v2 可選填）";
  a.addTextField("ltuid_v2", "");
  a.addSecureTextField("ltoken_v2", "");
  a.addSecureTextField("ltmid_v2（可不填）", "");
  a.addAction("儲存");
  a.addCancelAction("取消");
  const idx = await a.presentAlert();
  if (idx === -1) return false;
  const uid = a.textFieldValue(0).trim();
  const tok = a.textFieldValue(1).trim();
  const mid = a.textFieldValue(2).trim();
  if (!uid || !tok) return false;
  Keychain.set(KEY_UID, uid);
  Keychain.set(KEY_TOKEN, tok);
  if (mid) Keychain.set(KEY_MID, mid); else if (Keychain.contains(KEY_MID)) Keychain.remove(KEY_MID);
  return true;
}

function clearCreds() {
  [KEY_UID, KEY_TOKEN, KEY_MID].forEach(k => { if (Keychain.contains(k)) Keychain.remove(k); });
}

// ---------- 快取（檔案系統）----------
const fm = FileManager.local();
const CACHE_PATH = fm.joinPath(fm.documentsDirectory(), "zzz-battery-cache.json");
function loadCache() {
  try { if (fm.fileExists(CACHE_PATH)) return JSON.parse(fm.readString(CACHE_PATH)); } catch (e) {}
  return null;
}
function saveCache(obj) { try { fm.writeString(CACHE_PATH, JSON.stringify(obj)); } catch (e) {} }

// ---------- 取得電量 ----------
async function fetchBattery() {
  const cookie = "ltuid_v2=" + Keychain.get(KEY_UID) + "; ltoken_v2=" + Keychain.get(KEY_TOKEN) +
    (Keychain.contains(KEY_MID) ? "; ltmid_v2=" + Keychain.get(KEY_MID) : "");
  const req = new Request(API + "?server=" + CONFIG.SERVER + "&role_id=" + CONFIG.UID);
  req.method = "GET";
  req.timeoutInterval = 15;
  req.headers = {
    "Cookie": cookie,
    "DS": makeDS(),
    "x-rpc-app_version": "1.5.0",
    "x-rpc-client_type": "5",
    "x-rpc-language": "zh-tw",
    "x-rpc-lang": "zh-tw",
    "Origin": "https://act.hoyolab.com",
    "Referer": "https://act.hoyolab.com/",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  };
  const res = await req.loadJSON();
  if (res.retcode !== 0) {
    const e = new Error(res.message || "API 錯誤");
    e.retcode = res.retcode;
    throw e;
  }
  const en = res.data && res.data.energy;
  if (!en || !en.progress) throw new Error("回傳格式不符");
  const now = Date.now();
  const cur = en.progress.current, max = en.progress.max || CONFIG.MAX;
  let restore = Number(en.restore || 0);
  if (!restore && cur < max) restore = (max - cur) * CONFIG.SECONDS_PER_POINT; // API 沒給倒數時自行推算
  return { current: cur, max: max, fullAt: now + restore * 1000, ts: now };
}

// ---------- 估算 ----------
function estimate(r, now) {
  const max = r.max || CONFIG.MAX;
  let secsLeft;
  if (typeof r.fullAt === "number") secsLeft = Math.max(0, Math.round((r.fullAt - now) / 1000));
  else secsLeft = Math.max(0, (max - r.current) * CONFIG.SECONDS_PER_POINT - Math.floor((now - r.ts) / 1000));
  let cur = secsLeft === 0 ? max : max - Math.ceil(secsLeft / CONFIG.SECONDS_PER_POINT);
  cur = Math.max(r.current, Math.min(max, cur));
  if (cur >= max) secsLeft = 0;
  return { cur: cur, max: max, secsLeft: secsLeft };
}

function fmtDuration(s) {
  if (s <= 0) return "已滿";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + " 小時 " + m + " 分" : m + " 分鐘";
}
function fmtClock(ms) {
  const d = new Date(ms);
  const p = n => ("0" + n).slice(-2);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return (same ? "" : (d.getMonth() + 1) + "/" + d.getDate() + " ") + p(d.getHours()) + ":" + p(d.getMinutes());
}

// ---------- 畫面 ----------
function buildWidget(state) {
  // state: {reading, est, cached, error, needSetup}
  const BG = new Color("#0e0f12"), FG = new Color("#f2f3f5"), DIM = new Color("#8a8f98"),
        LINE = new Color("#23262c"), ACC = new Color("#e8d44d"), WARN = new Color("#e5735a");
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.url = CONFIG.OPEN_GAME_ON_TAP ? CONFIG.GAME_SCHEME : CONFIG.DASHBOARD_URL;
  w.refreshAfterDate = new Date(Date.now() + CONFIG.REFRESH_MINUTES * 60 * 1000);
  const small = config.widgetFamily === "small";
  w.setPadding(small ? 14 : 16, 16, small ? 14 : 16, 16);

  function txt(stack, s, size, color, weight) {
    const t = stack.addText(s);
    t.font = weight ? Font.boldSystemFont(size) : Font.systemFont(size);
    t.textColor = color;
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.6;
    return t;
  }

  const head = w.addStack();
  head.centerAlignContent();
  txt(head, "電量", 12, DIM);
  head.addSpacer();
  if (state.reading) {
    const tag = state.cached ? "估算" : "即時";
    txt(head, state.error ? "快取 · " + tag : tag, 10, state.cached ? WARN : DIM);
  }

  if (state.needSetup || !state.reading) {
    w.addSpacer();
    txt(w, state.needSetup ? "尚未設定" : "無法取得", small ? 16 : 20, FG, true);
    w.addSpacer(4);
    const m = w.addText(state.error || "請在 Scriptable 內執行此腳本完成設定");
    m.font = Font.systemFont(11); m.textColor = state.needSetup ? DIM : WARN;
    m.minimumScaleFactor = 0.6;
    w.addSpacer();
    return w;
  }

  const e = state.est;
  w.addSpacer(small ? 4 : 6);
  const row = w.addStack();
  row.bottomAlignContent();
  const full = e.cur >= e.max;
  txt(row, String(e.cur), small ? 38 : 46, full ? ACC : FG, true);
  txt(row, " / " + e.max, small ? 15 : 18, DIM);

  w.addSpacer(small ? 6 : 8);
  // 進度條
  const barW = small ? 120 : 300, barH = 4;
  const ctx = new DrawContext();
  ctx.size = new Size(barW, barH);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  ctx.setFillColor(LINE);
  ctx.fillRect(new Rect(0, 0, barW, barH));
  ctx.setFillColor(full ? ACC : FG);
  ctx.fillRect(new Rect(0, 0, barW * Math.min(1, e.cur / e.max), barH));
  const img = w.addImage(ctx.getImage());
  img.imageSize = new Size(barW, barH);

  w.addSpacer(small ? 6 : 8);
  if (small) {
    txt(w, full ? "電量已滿" : "距滿 " + fmtDuration(e.secsLeft), 12, FG);
    w.addSpacer(2);
    txt(w, full ? "" : "滿電 " + fmtClock(Date.now() + e.secsLeft * 1000), 11, DIM);
  } else {
    const r2 = w.addStack();
    const l = r2.addStack(); l.layoutVertically();
    txt(l, "距離滿電", 10, DIM);
    txt(l, fmtDuration(e.secsLeft), 14, FG, true);
    r2.addSpacer();
    const rr = r2.addStack(); rr.layoutVertically();
    txt(rr, "滿電時間", 10, DIM);
    txt(rr, full ? "—" : fmtClock(Date.now() + e.secsLeft * 1000), 14, FG, true);
  }
  w.addSpacer();
  const foot = w.addStack();
  txt(foot, "更新 " + fmtClock(state.reading.ts), 9, DIM);
  if (state.error && !small) {
    foot.addSpacer();
    txt(foot, state.error, 9, WARN);
  }
  return w;
}

// ---------- 主流程 ----------
function pad2(n) { return ("0" + n).slice(-2); }
// 以台北時間 (+08:00) 輸出 ISO 時間字串
function isoTaipei(ms) {
  const d = new Date(ms + 8 * 3600000);
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()) + "T" +
    pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()) + ":" + pad2(d.getUTCSeconds()) + "+08:00";
}
function errCode(e) {
  if (e && (e.retcode === -100 || e.retcode === 10001)) return "auth";
  if (e && e.retcode === 10102) return "note";
  if (e && (e.retcode === 1034 || e.retcode === 5003 || e.retcode === 10035)) return "verify";
  if (e && e.retcode) return "unknown";
  if (e && e.message === "回傳格式不符") return "format";
  return "network";
}
// 由儀表板透過 URL scheme 呼叫：?sync=1&return=<儀表板網址>
async function runSync(q) {
  const ret = String(q.return || "");
  const okReturn = ret.indexOf(CONFIG.DASHBOARD_URL) === 0 && ret.indexOf("#") < 0;
  const base = okReturn ? ret.split("?")[0] : CONFIG.DASHBOARD_URL;
  let code = null;
  if (!hasCreds() || CONFIG.UID === "YOUR_ZZZ_UID" || !/^\d+$/.test(CONFIG.UID)) code = "setup";
  else {
    try {
      const fresh = await fetchBattery();
      saveCache(fresh);
      const url = base + "?battery=" + fresh.current + "&at=" + encodeURIComponent(isoTaipei(fresh.ts)) + "&max=" + fresh.max;
      if (okReturn) { Safari.open(url); Script.complete(); return; }
      const a = new Alert(); a.title = "目前電量 " + fresh.current + "/" + fresh.max;
      a.message = "回傳網址不符，未自動開啟儀表板。"; a.addAction("好"); await a.presentAlert();
      Script.complete(); return;
    } catch (e) { code = errCode(e); }
  }
  if (okReturn) { Safari.open(base + "?batteryError=" + code); }
  else {
    const a = new Alert(); a.title = "同步失敗"; a.message = "錯誤代碼：" + code; a.addAction("好"); await a.presentAlert();
  }
  Script.complete();
}

async function main() {
  const q = args.queryParameters || {};
  if (q.sync === "1") { await runSync(q); return; }
  const inApp = config.runsInApp;

  if (inApp) {
    // 在 App 內執行：選單
    const menu = new Alert();
    menu.title = "絕區零電量小工具";
    menu.addAction(hasCreds() ? "重新設定憑證" : "設定憑證");
    menu.addAction("預覽中型小工具");
    menu.addAction("預覽小型小工具");
    menu.addDestructiveAction("清除憑證與快取");
    menu.addCancelAction("關閉");
    const choice = await menu.presentAlert();
    if (choice === 0) { await promptCreds(); }
    else if (choice === 3) {
      clearCreds();
      try { fm.remove(CACHE_PATH); } catch (e) {}
      const d = new Alert(); d.title = "已清除"; d.addAction("好"); await d.presentAlert();
      return;
    }
    else if (choice === -1) return;
    if (choice === 0 && !hasCreds()) return;
    if (choice === 2) config.widgetFamily = "small"; else config.widgetFamily = "medium";
  }

  const cache = loadCache();
  let state = { reading: cache, cached: !!cache, error: null, needSetup: false };

  if (!hasCreds()) {
    state.needSetup = true;
  } else if (CONFIG.UID === "YOUR_ZZZ_UID" || !/^\d+$/.test(CONFIG.UID)) {
    state.error = "請先在腳本 CONFIG 填入 UID";
    state.cached = true;
  } else {
    try {
      const fresh = await fetchBattery();
      saveCache(fresh);
      state = { reading: fresh, cached: false, error: null, needSetup: false };
    } catch (e) {
      let msg = "連線失敗";
      if (e.retcode === -100 || e.retcode === 10001) msg = "憑證失效，請重新設定";
      else if (e.retcode === 10102) msg = "請在 HoYoLAB 開啟即時便箋";
      else if (e.retcode === 1034 || e.retcode === 5003 || e.retcode === 10035) msg = "需要驗證，請稍後再試";
      else if (e.retcode) msg = "錯誤 " + e.retcode;
      state.error = msg;
    }
  }
  if (state.reading) {
    state.est = estimate(state.reading, Date.now());
    // 距離上次成功超過門檻，視為估算
    if (!state.cached && Date.now() - state.reading.ts > CONFIG.STALE_MINUTES * 60000) state.cached = true;
  }

  const widget = buildWidget(state);
  if (inApp) {
    if (config.widgetFamily === "small") await widget.presentSmall(); else await widget.presentMedium();
  } else {
    Script.setWidget(widget);
  }
  Script.complete();
}

await main();
