// Fetch ZZZ stamina from HoYoLAB and write battery.json (value/max/at only).
const crypto = require("crypto");
const fs = require("fs");
const { HOYO_LTUID_V2: U, HOYO_LTOKEN_V2: T, ZZZ_UID: ID } = process.env;
if (!U || !T || !ID) { console.log("Missing secrets; skipping."); process.exit(0); }
const SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";
function ds() {
  const t = Math.floor(Date.now() / 1000);
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let r = ""; for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return t + "," + r + "," + crypto.createHash("md5").update("salt=" + SALT + "&t=" + t + "&r=" + r).digest("hex");
}
(async () => {
  const url = "https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz/note?server=prod_gf_sg&role_id=" + encodeURIComponent(ID);
  let res;
  try {
    const r = await fetch(url, { headers: {
      Cookie: "ltuid_v2=" + U + "; ltoken_v2=" + T, DS: ds(),
      "x-rpc-app_version": "1.5.0", "x-rpc-client_type": "5", "x-rpc-language": "zh-tw", "x-rpc-lang": "zh-tw",
      Origin: "https://act.hoyolab.com", Referer: "https://act.hoyolab.com/", Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } });
    console.log("HTTP status:", r.status);
    res = await r.json();
  } catch (e) { console.log("Request failed:", e.message); process.exit(0); }
  if (res.retcode !== 0) { console.log("HoYoLAB error retcode=" + res.retcode + " message=" + res.message + " (no update)"); process.exit(0); }
  const p = res.data && res.data.energy && res.data.energy.progress;
  if (!p || !Number.isInteger(p.current)) { console.log("Unexpected response shape (no update)"); process.exit(0); }
  const max = p.max || 240;
  const d = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 19) + "+08:00";
  fs.writeFileSync("battery.json", JSON.stringify({ value: p.current, max, at: d }) + "\n");
  console.log("Battery synced:", p.current + "/" + max);
})();
