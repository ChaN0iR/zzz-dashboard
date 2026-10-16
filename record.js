(function(){
var EL={200:'物理',201:'火',202:'冰',203:'電',205:'玄墨',204:'以太',300:'流明'};
var EL2={200:'物理',201:'火',202:'冰',203:'電',204:'以太',205:'玄墨',300:'流明'};
var PROF={1:'強攻',2:'擊破',3:'異常',4:'支援',5:'防護',6:'命破'};
var SK={0:'普通攻擊',1:'特殊技',2:'閃避',3:'連攜技',5:'核心被動',6:'支援技'};
var VHS={SaleStateDone:'已完成營業',SaleStateDoing:'營業中',SaleStateNo:'尚未營業'};
var CARD={CardSignDone:'已刮',CardSignNo:'尚未刮'};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function n(v){return Number(v||0).toLocaleString('en-US');}
function pct(v){return (v/100).toFixed(2).replace(/\.?0+$/,'')+'%';}
function tile(l,v,sub){return '<div class="tile"><div class="n">'+v+'</div><div class="l">'+esc(l)+'</div>'+(sub?'<div class="small">'+sub+'</div>':'')+'</div>';}
function prog(l,a){if(!a)return '';return tile(l,n(a[0])+' / '+n(a[1]));}
function days(sec){var d=Math.floor(sec/86400),h=Math.floor(sec%86400/3600);return d>0?d+' 天 '+h+' 小時':h+' 小時';}
function sec(t){return '<h2>'+t+'</h2>';}
function noData(t){return '<div class="card small">'+t+'</div>';}
function note(d){
  var x=d.note;if(!x)return noData('目前沒有取得每日資料。');
  var h='<div class="tiles">';
  h+=prog('每日活躍度',x.vitality);
  h+=tile('影像店營業',esc(VHS[x.vhsSale]||'未知'));
  h+=tile('刮刮樂',esc(CARD[x.cardSign]||'未知'));
  h+=prog('懸賞委託',x.bounty);
  h+=prog('每週任務點數',x.weekly);
  if(x.memberLeftSec!=null)h+=tile('嶄新月卡剩餘',days(x.memberLeftSec));
  h+='</div>';
  if(x.refreshSec&&x.refreshSec.weekly)h+='<p class="small">每週內容還有 '+days(x.refreshSec.weekly)+'重置。</p>';
  return h;
}
function stats(d){
  var s=d.stats;if(!s)return noData('目前沒有取得戰績。');
  var h='<div class="tiles">'+tile('世界等級',esc(s.worldLevel))+tile('稱號',esc(s.title||'無'))+tile('活躍天數',n(s.activeDays))+tile('代理人',n(s.agents))+tile('邦布',n(s.bangboo))+tile('成就',n(s.achievements));
  if(s.shop)h+=tile('影像店等級',n(s.shop.level),'營業 '+n(s.shop.days)+' 天')+tile('影像店累計收入',n(s.shop.income));
  h+='</div>';
  if(s.coins&&s.coins.length)h+='<p class="small">'+s.coins.map(function(c){return esc(c.name)+' '+n(c.num);}).join('、')+'</p>';
  return h;
}
function hadal(d){
  var a=d.hadal;if(!a||!a.length)return noData('目前沒有取得式輿防衛戰資料。');
  var h='';
  a.forEach(function(p){
    var t=(p.current?'本期':'上期')+' '+esc(p.start)+' 至 '+esc(p.end);
    if(!p.floors&&!p.score){h+='<div class="card" style="margin-bottom:8px"><b>'+t+'</b><div class="small">這一期尚未挑戰。</div></div>';return;}
    h+='<div class="card" style="margin-bottom:8px"><b>'+t+'</b><div class="tiles" style="margin-top:8px">'+tile('評價',esc(p.rating||'無'))+tile('分數',n(p.score)+' / '+n(p.maxScore))+tile('通過層數',n(p.floors)+(p.passFifth?'（含第五層）':''))+tile('排名','前 '+pct(p.rankPct))+'</div></div>';
  });
  if(d.stats&&d.stats.hadalFullS!=null)h+='<p class="small">累計全 S 評價 '+n(d.stats.hadalFullS)+' 次。</p>';
  return h;
}
function assault(d){
  var s=d.stats&&d.stats.assault,h='';
  (d.assaultPeriods||[]).forEach(function(p){
    var t=(p.current?'本期':'上期')+' '+esc(p.start)+' 至 '+esc(p.end);
    h+='<div class="card" style="margin-bottom:8px"><b>'+t+'</b>'+(p.has?'<div class="tiles" style="margin-top:8px">'+tile('分數',n(p.score))+tile('星數',n(p.stars))+tile('排名','前 '+pct(p.rankPct))+'</div>':'<div class="small">這一期尚未挑戰。</div>')+'</div>';
  });
  if(s)h+='<div class="card"><b>最近一次完整紀錄</b><div class="tiles" style="margin-top:8px">'+tile('一般分數',n(s.score),'星數 '+n(s.stars)+'，前 '+pct(s.rankPct))+(s.hardScore?tile('困難分數',n(s.hardScore),'星數 '+n(s.hardStars)+'，前 '+pct(s.hardRankPct)):'')+'</div></div>';
  if(d.stats&&d.stats.assaultFullStars!=null)h+='<p class="small">累計滿星 '+n(d.stats.assaultFullStars)+' 次。</p>';
  return h||noData('目前沒有取得危局強襲資料。');
}
function agents(d){
  var l=d.agents;if(!l||!l.length)return noData('目前沒有取得代理人資料。');
  var rows=l.slice().sort(function(a,b){return (b.level-a.level)||(b.rank-a.rank)||(a.rarity<b.rarity?1:-1);}).map(function(a){
    var suits={};(a.discs||[]).forEach(function(x){if(x.suit)suits[x.suit]=Math.max(suits[x.suit]||0,x.suitOwn);});
    var su=Object.keys(suits).map(function(k){return k+' '+suits[k]+' 件';}).join('、');
    var w=a.weapon?esc(a.weapon.name)+' 等級 '+a.weapon.level+'，精煉 '+a.weapon.star:'未裝備';
    var dl=(a.discs||[]);var dlv=dl.length?dl.map(function(x){return x.level;}).join('/'):'';
    var sk=(a.skills||[]).map(function(k){return k.level;}).join('/');
    return '<tr><td><img src="'+esc(a.icon)+'" width="32" height="32" alt="" style="vertical-align:middle;margin-right:8px;border-radius:4px">'+esc(a.name)+'</td><td>'+(EL2[a.element]||'')+'</td><td>'+(PROF[a.prof]||'')+'</td><td>'+a.rarity+'</td><td>'+a.level+'</td><td>'+(a.rank?a.rank+' 影':'0 影')+'</td><td>'+w+'</td><td>'+(dl.length+' 件'+(dlv?'（'+dlv+'）':''))+'</td><td>'+esc(su)+'</td><td>'+sk+'</td></tr>';
  }).join('');
  return '<div class="tw"><table><thead><tr><th>代理人</th><th>屬性</th><th>特性</th><th>階級</th><th>等級</th><th>影畫</th><th>音擎</th><th>驅動盤等級</th><th>套裝</th><th>技能等級</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="small">技能順序：普通攻擊、特殊技、閃避、連攜技、核心被動、支援技。</p>';
}
function bangboo(d){
  var l=d.bangboo;if(!l||!l.length)return noData('目前沒有取得邦布資料。');
  return '<div class="tw"><table style="min-width:420px"><thead><tr><th>邦布</th><th>階級</th><th>等級</th><th>星級</th></tr></thead><tbody>'+l.map(function(b){return '<tr><td><img src="'+esc(b.icon)+'" width="32" height="32" alt="" style="vertical-align:middle;margin-right:8px">'+esc(b.name)+'</td><td>'+b.rarity+'</td><td>'+b.level+'</td><td>'+b.star+'</td></tr>';}).join('')+'</tbody></table></div>';
}
function areas(d){
  var l=d.areas;if(!l||!l.length)return '';
  return sec('城區收集')+'<div class="tiles">'+l.map(function(a){return tile(a.name,a.pct+'%');}).join('')+'</div>';
}
window.zzzRecordMount=function(el){
  el.innerHTML='<p class="small">讀取中。</p>';
  fetch('data.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d){el.innerHTML=noData('尚未取得戰績資料。<br>請稍後重新整理，資料每 30 分鐘更新一次。');return;}
    var at=d.at?d.at.replace('T',' ').slice(0,16):'';
    el.innerHTML='<p class="small">資料來自 HoYoLAB，更新於 '+esc(at)+'（台北）。<br>倉庫道具與材料數量 HoYoLAB 沒有提供，因此不顯示。</p>'+
      sec('每日')+note(d)+sec('戰績')+stats(d)+sec('式輿防衛戰')+hadal(d)+sec('危局強襲')+assault(d)+areas(d)+sec('代理人（'+(d.agents?d.agents.length:0)+'）')+agents(d)+sec('邦布（'+(d.bangboo?d.bangboo.length:0)+'）')+bangboo(d);
  }).catch(function(){el.innerHTML=noData('讀取戰績資料失敗。');});
};
})();
