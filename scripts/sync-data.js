// Fetch ZZZ game record from HoYoLAB and write data.json (no secrets, no cookies).
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
const BASE = "https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz/";
async function get(path, extra) {
  const url = BASE + path + "?server=prod_gf_sg&role_id=" + encodeURIComponent(ID) + (extra || "");
  try {
    const r = await fetch(url, { headers: {
      Cookie: "ltuid_v2=" + U + "; ltoken_v2=" + T, DS: ds(),
      "x-rpc-app_version": "1.5.0", "x-rpc-client_type": "5", "x-rpc-language": "zh-tw", "x-rpc-lang": "zh-tw",
      Origin: "https://act.hoyolab.com", Referer: "https://act.hoyolab.com/", Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } });
    const j = await r.json();
    if (j.retcode !== 0) { console.log(path, "retcode=" + j.retcode); return null; }
    return j.data;
  } catch (e) { console.log(path, "failed:", e.message); return null; }
}
const tsOf = (o) => o && o.year ? Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - 8 * 3600000 : 0;
const iso = (ms) => ms ? new Date(ms + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ") : "";
const strip = (s) => String(s || "").replace(/<[^>]*>/g, "");

(async () => {
  const out = { at: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 19) + "+08:00", uid: ID };
  const [index, note, basic, buddy] = await Promise.all([get("index"), get("note"), get("avatar/basic"), get("buddy/info")]);

  if (note) out.note = {
    vitality: note.vitality ? [note.vitality.current, note.vitality.max] : null,
    vhsSale: note.vhs_sale && note.vhs_sale.sale_state || null,
    cardSign: note.card_sign || null,
    bounty: note.bounty_commission && note.bounty_commission.unlock ? [note.bounty_commission.num, note.bounty_commission.total] : null,
    weekly: note.weekly_task && note.weekly_task.unlock ? [note.weekly_task.cur_point, note.weekly_task.max_point] : null,
    memberLeftSec: note.member_card && note.member_card.is_open ? Number(note.member_card.exp_time) || 0 : null,
    temple: note.temple_running ? { level: note.temple_running.level, autoRunning: !!(note.temple_running.auto_work && note.temple_running.auto_work.is_auto_work_running) } : null,
    refreshSec: { bounty: note.bounty_commission && note.bounty_commission.refresh_time || 0, weekly: note.weekly_task && note.weekly_task.refresh_time || 0 },
  };

  if (index) {
    const s = index.stats || {};
    out.stats = {
      activeDays: s.active_days, agents: s.avatar_num, bangboo: s.buddy_num, achievements: s.achievement_count,
      worldLevel: s.world_level_name, title: index.game_data_show && index.game_data_show.personal_title || "",
      shop: s.temple_data ? { level: s.temple_data.level, days: s.temple_data.sell_days, income: s.temple_data.total_sell_temple_coin } : null,
      coins: (s.commemorative_coins_list || []).map(c => ({ name: c.name, num: c.num })),
      assault: s.memory_battlefield ? { score: s.memory_battlefield.total_score, stars: s.memory_battlefield.total_star, rankPct: s.memory_battlefield.rank_percent,
        hardScore: s.memory_battlefield.hard_total_score, hardStars: s.memory_battlefield.hard_total_star, hardRankPct: s.memory_battlefield.hard_rank_percent } : null,
      assaultFullStars: s.memory_battlefield_full_stars_times,
      hadalFullS: s.challenge_full_s_times,
    };
    out.areas = (index.area_collections || []).filter(a => !a.is_lock).map(a => ({ name: strip(a.name), pct: a.collection_progress }));
    out.schedule = (index.challenge_schedule_list || []).map(c => ({ type: c.challenge_type, start: iso(c.start_ts * 1000), end: iso(c.end_ts * 1000) }));
  }

  // Shiyu Defense (式輿防衛戰): current period, else previous one
  const hd = [];
  for (const t of [1, 2]) {
    const h = await get("hadal_info_v2", "&uid=" + ID + "&region=prod_gf_sg&schedule_type=" + t + "&need_all=true");
    const v = h && h.hadal_info_v2; if (!v) continue;
    hd.push({ current: t === 1, start: iso(tsOf(v.hadal_begin_time)), end: iso(tsOf(v.hadal_end_time)),
      score: v.brief ? v.brief.score : 0, maxScore: v.brief ? v.brief.max_score : 0, rating: v.brief ? v.brief.rating : "", rankPct: v.brief ? v.brief.rank_percent : 0,
      floors: v.brief ? v.brief.cur_period_zone_layer_count : 0, passFifth: !!v.pass_fifth_floor });
  }
  if (hd.length) out.hadal = hd;

  // Deadly Assault (危局強襲) periods
  const ma = [];
  for (const t of [1, 2]) {
    const m = await get("mem_detail", "&uid=" + ID + "&region=prod_gf_sg&schedule_type=" + t + "&need_all=true");
    if (!m) continue;
    ma.push({ current: t === 1, start: iso(tsOf(m.start_time)), end: iso(tsOf(m.end_time)), has: !!m.has_data, score: m.total_score, stars: m.total_star, rankPct: m.rank_percent,
      bosses: (m.list || []).map(b => ({ score: b.score, star: b.star, name: b.boss && b.boss[0] && b.boss[0].name || "" })) });
  }
  if (ma.length) out.assaultPeriods = ma;

  if (buddy && buddy.list) out.bangboo = buddy.list.map(b => ({ id: b.id, name: b.name, rarity: b.rarity, level: b.level, star: b.star, icon: b.bangboo_square_url || b.bangboo_rectangle_url }));

  if (basic && basic.avatar_list) {
    const list = [];
    for (const a of basic.avatar_list) {
      const d = await get("avatar/info", "&id_list%5B%5D=" + a.id);
      const x = d && d.avatar_list && d.avatar_list[0];
      const o = { id: a.id, name: a.name_mi18n, full: a.full_name_mi18n, element: a.element_type, prof: a.avatar_profession, rarity: a.rarity, level: a.level, rank: a.rank, icon: a.role_square_url };
      if (x) {
        o.weapon = x.weapon ? { name: x.weapon.name, level: x.weapon.level, star: x.weapon.star, rarity: x.weapon.rarity } : null;
        o.discs = (x.equip || []).map(e => ({ pos: e.equipment_type, name: e.name, level: e.level, rarity: e.rarity, suit: e.equip_suit && e.equip_suit.name || "", suitOwn: e.equip_suit && e.equip_suit.own || 0 }));
        o.skills = (x.skills || []).map(k => ({ type: k.skill_type, level: k.level }));
        o.stats = (x.properties || []).map(p => ({ name: p.property_name, v: p.final }));
      }
      list.push(o);
    }
    out.agents = list;
  }

  if (!out.note && !out.stats && !out.agents) { console.log("No data fetched; no update."); process.exit(0); }
  // keep previous sections if a request failed this run
  try {
    const old = JSON.parse(fs.readFileSync("data.json", "utf8"));
    for (const k of Object.keys(old)) if (!(k in out)) out[k] = old[k];
  } catch (e) {}
  // skip writing when only volatile fields (timestamp, countdowns) changed
  const norm = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.at; if (c.note) { delete c.note.refreshSec; delete c.note.memberLeftSec; } return JSON.stringify(c); };
  try { if (norm(JSON.parse(fs.readFileSync("data.json", "utf8"))) === norm(out)) { console.log("No change."); process.exit(0); } } catch (e) {}
  fs.writeFileSync("data.json", JSON.stringify(out) + "\n");
  console.log("data.json written:", Object.keys(out).join(","));
})();
