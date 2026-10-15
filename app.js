(function(){
'use strict';
var KEY='zzz-dashboard-v1';
var PRI=['主力','養成中','暫不養'];
var SK=['普通攻擊','閃避','支援技','特殊技','連攜技','核心技'];
var SKMAX={'普通攻擊':16,'閃避':16,'支援技':16,'特殊技':16,'連攜技':16,'核心技':7};
var DS=['生命值','攻擊力','防禦力','衝擊力','暴擊率','暴擊傷害','異常掌控','異常精通','穿透率','能量自動回復','穿透值'];

function clone(x){return JSON.parse(JSON.stringify(x));}
function load(){
  try{var s=localStorage.getItem(KEY);if(s){var o=JSON.parse(s);if(o&&o.agents)return o;}}catch(e){}
  return fresh();
}
function fresh(){return ensure(fresh0());}
function fresh0(){
  var d=clone(window.ZZZ_INITIAL);
  d.agents.forEach(function(a){a.priority='養成中';a.note='';});
  return d;
}
var S=ensure(load());
function nowISO(){return new Date().toISOString();}
function ensure(o){
  var ini=window.ZZZ_INITIAL.battery;
  if(!o.battery||!o.battery.at||isNaN(Date.parse(o.battery.at))||(ini&&Date.parse(ini.at)>Date.parse(o.battery.at)))o.battery=ini?clone(ini):{value:0,at:nowISO()};
  ['checkins','goals','events'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});
  if(!o.batteryTarget)o.batteryTarget=240;
  if(!o.created)o.created=nowISO();
  return o;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(v){var n=parseFloat(String(v==null?'':v).replace(/[^\d.\-]/g,''));return isNaN(n)?0:n;}
function lvn(s){var m=String(s==null?'':s).match(/\d+/);return m?parseInt(m[0],10):0;}
function fin(a,k){var v=a.final_stats&&a.final_stats[k];return v&&v.length?v[v.length-1]:'';}

function engineOK(a){return a.w_engine&&a.w_engine.name&&lvn(a.w_engine.level)>=60;}
function discs(a){return a.drive_discs||[];}
/* ---------- role / build type ---------- */
var BT=['暴擊輸出','異常','支援','擊破','防護'];
var FLATABLE={'攻擊力':1,'生命值':1,'防禦力':1};
var W={
 '暴擊輸出':{'暴擊率':1,'暴擊傷害':1,'攻擊力%':0.7,'攻擊力':0.2,'穿透值':0.5},
 '異常':{'異常精通':1,'攻擊力%':0.6,'攻擊力':0.15,'穿透值':0.4},
 '支援':{'攻擊力%':0.6,'生命值%':0.6,'防禦力%':0.4,'異常精通':0.6,'暴擊率':0.3,'暴擊傷害':0.3,'穿透值':0.2,'攻擊力':0.15},
 '擊破':{'攻擊力%':0.8,'穿透值':0.5,'暴擊率':0.3,'暴擊傷害':0.3,'攻擊力':0.2},
 '防護':{'生命值%':1,'防禦力%':1,'生命值':0.2,'防禦力':0.2,'攻擊力%':0.2}
};
var MAINOK={
 '暴擊輸出':{4:['暴擊率','暴擊傷害'],6:['攻擊力']},
 '異常':{4:['異常精通'],6:['異常掌控','攻擊力']},
 '擊破':{4:['暴擊率','暴擊傷害','攻擊力'],6:['衝擊力']}
};
var LOWPCT=55;
function inferBuild(a){
  var w=a.w_engine&&a.w_engine.name?a.w_engine:null,sub=w?(Object.keys(w.sub_stat||{})[0]||''):'';
  if(sub==='暴擊率'||sub==='暴擊傷害'||sub==='穿透率')return '暴擊輸出';
  if(sub==='異常掌控'||sub==='異常精通')return '異常';
  if(sub==='衝擊力')return '擊破';
  if(sub==='能量自動回復')return '支援';
  if(sub==='防禦力'||sub==='生命值')return '防護';
  var cr=num(fin(a,'暴擊率')),am=num(fin(a,'異常精通'));
  if(cr>=40)return '暴擊輸出';
  if(am>=250)return '異常';
  return '支援';
}
function buildOf(a){return BT.indexOf(a.build)>=0?a.build:inferBuild(a);}
function subW(t,x){var st=x.stat,k=st+(FLATABLE[st]&&/%/.test(x.value)?'%':'');return (W[t]||{})[k]||0;}
function mainOK(t,slot,mk){
  if(slot<4||!MAINOK[t])return null;
  if(slot===5)return /傷害加成$|穿透率/.test(mk);
  var l=MAINOK[t][slot];return l?l.indexOf(mk)>=0:null;
}
function mainWant(t,slot){return slot===5?'屬性傷害加成或穿透率':(MAINOK[t]&&MAINOK[t][slot]||[]).join('／');}
function roleEval(a,d,c15,sk,mx){
  var bt=buildOf(a),effs=[],low=[],mm=0,mc=0,mbad=[],zero=[],dEff={};
  d.forEach(function(x,i){
    var sl=x.slot||i+1,l=lvn(x.level),sb=x.substats||[];
    if(l===0)zero.push(sl);
    if(sb.length&&l>0){
      var ef=sb.reduce(function(t,y){return t+subW(bt,y);},0)/sb.length;
      var pct=Math.min(100,Math.round(ef/0.7*100));
      effs.push(ef);dEff[sl]=pct;
      if(pct<LOWPCT)low.push({slot:sl,set:x.set,pct:pct});
    }
    var mk=Object.keys(x.main_stat||{})[0]||'',ok=mainOK(bt,sl,mk);
    if(ok!==null){mc++;if(ok)mm++;else mbad.push({slot:sl,cur:mk||'空',want:mainWant(bt,sl)});}
  });
  var avg=effs.length?effs.reduce(function(t,y){return t+y;},0)/effs.length:0;
  var effPct=Math.min(100,Math.round(avg/0.7*100));
  var w=a.w_engine,rs=0;
  if(w&&w.name)rs+=25*Math.min(1,lvn(w.level)/60);
  rs+=25*c15/6+10*sk/mx+30*effPct/100+10*(mc?mm/mc:1);
  return{bt:bt,rs:Math.round(rs),effPct:effPct,discEff:dEff,low:low,mbad:mbad,zero:zero};
}
function autoNext(a,e,d){
  var w=a.w_engine;
  if(!w||!w.name)return '裝備一把音擎';
  if(lvn(w.level)<60)return '音擎升到 Lv60（目前 Lv'+lvn(w.level)+'）';
  if(d.length<6)return '補齊驅動盤（目前 '+d.length+' / 6 片）';
  if(e.zero.length)return '把第 '+e.zero.join('、')+' 號位的 Lv0 驅動盤升級';
  if(e.mbad.length)return '第 '+e.mbad[0].slot+' 號位主詞條換成 '+e.mbad[0].want+'（目前 '+e.mbad[0].cur+'）';
  if(e.low.length)return '更換第 '+e.low[0].slot+' 號位驅動盤（有效詞條只有 '+e.low[0].pct+'%）';
  if(e.c15<6)return '把驅動盤升到 Lv15（目前 '+e.c15+' / 6）';
  var lowsk=SK.filter(function(k){return num(a.skills&&a.skills[k])<SKMAX[k]*0.5;});
  if(lowsk.length)return '提升技能：'+lowsk.join('、');
  return '目前沒有明顯缺口，維持即可';
}
function nextOf(a,e){return (a.next&&String(a.next).trim())||e.next;}

function evalAgent(a){
  var gaps=[],sc=0;
  var w=a.w_engine;
  if(!w||!w.name){gaps.push('未裝備音擎');}
  else{
    if(lvn(w.level)<60)gaps.push('音擎 Lv'+lvn(w.level)+'（未滿 60）');
    sc+=30*Math.min(1,lvn(w.level)/60);
  }
  var d=discs(a),c15=0,c0=0;
  d.forEach(function(x){var l=lvn(x.level);if(l>=15)c15++;if(l===0)c0++;});
  if(d.length<6)gaps.push('驅動盤只有 '+d.length+' / 6 片');
  if(c0)gaps.push(c0+' 片驅動盤 Lv0');
  var low=d.length-c15-c0;
  if(low>0)gaps.push(low+' 片驅動盤未滿 Lv15');
  sc+=40*c15/6;
  var sk=0,mx=0,lowsk=[];
  SK.forEach(function(k){var v=num(a.skills&&a.skills[k]);sk+=v;mx+=SKMAX[k];if(v<SKMAX[k]*0.5)lowsk.push(k);});
  sc+=15*sk/mx;
  if(lowsk.length)gaps.push('技能偏低：'+lowsk.join('、'));
  var cr=num(fin(a,'暴擊率')),cd=num(fin(a,'暴擊傷害'));
  var cp=Math.min(1,(cr*2+cd)/200);
  sc+=15*cp;
  sc=Math.round(sc);
  var flag=!engineOK(a)||c0>0||sc<60;
  var R=roleEval(a,d,c15,sk,mx);
  R.low.forEach(function(x){gaps.push('第 '+x.slot+' 號位驅動盤有效詞條偏低（'+x.pct+'%）');});
  R.mbad.forEach(function(x){gaps.push('第 '+x.slot+' 號位主詞條「'+x.cur+'」不符'+R.bt+'（建議 '+x.want+'）');});
  var res={score:sc,gaps:gaps,flag:flag,c15:c15,c0:c0,skAvg:sk/SK.length,cr:cr,cd:cd,bt:R.bt,rs:R.rs,effPct:R.effPct,discEff:R.discEff,low:R.low,mbad:R.mbad,zero:R.zero};
  res.next=autoNext(a,res,d);
  return res;
}
function bar(p){var c=p<50?'low':p<75?'mid':'hi';return '<div class="bar '+c+'"><i style="width:'+p+'%"></i></div>';}

function agentById(i){return S.agents.filter(function(a){return a.index===i;})[0];}

/* ---------- time helpers (Asia/Taipei) ---------- */
var TZ='Asia/Taipei',MIN6=360000,CAP=240;
var dtf=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function tp(ms){var o={};dtf.formatToParts(new Date(ms)).forEach(function(p){o[p.type]=p.value;});return o;}
function tpDate(ms){var o=tp(ms);return o.year+'-'+o.month+'-'+o.day;}
function tpStamp(ms){
  var o=tp(ms),t=tpDate(ms),n=Date.now();
  var day=t===tpDate(n)?'今天':t===tpDate(n+864e5)?'明天':t===tpDate(n-864e5)?'昨天':o.month+'/'+o.day;
  return day+' '+o.hour+':'+o.minute;
}
function dur(ms){
  var m=Math.ceil(Math.max(0,ms)/60000),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mm=m%60;
  if(d)return d+' 天'+(h?' '+h+' 小時':'');
  if(h)return h+' 小時'+(mm?' '+mm+' 分':'');
  return mm+' 分';
}
function dayStart(s){return Date.parse(s+'T00:00:00+08:00');}
function dayDiff(s){return Math.round((dayStart(s)-dayStart(tpDate(Date.now())))/864e5);}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

/* ---------- battery ---------- */
function batNow(now){
  var b=S.battery,at=Date.parse(b.at),v=num(b.value);
  now=now||Date.now();
  var cur=v>=CAP?v:Math.min(CAP,v+Math.max(0,Math.floor((now-at)/MIN6)));
  return{cur:cur,at:at,v:v};
}
/* ms until battery reaches T, starting from current estimate minus spend */
function msTo(T,from){return from>=T?0:(T-from)*MIN6;}
function dur2(ms){
  var m=Math.ceil(ms/60000),h=Math.floor(m/60);m=m%60;
  if(h&&m)return h+' 小時 '+m+' 分鐘';if(h)return h+' 小時';return m+' 分鐘';
}
function hm(ms){
  var o=tp(ms),same=tpDate(ms)===tpDate(Date.now());
  var t=o.hour+':'+o.minute;if(t.length<5)t=('0'+t).slice(-5);
  return (same?'':'明天 ')+t;
}
function dayPart(ms){
  var o=tp(ms),h=parseInt(o.hour,10)%24,d=tpDate(ms)===tpDate(Date.now())?'今天':'明天';
  var p=h<5?'凌晨':h<11?'早上':h<13?'中午':h<18?'下午':'晚上';
  return d+p;
}
var BAT_SVG='<svg class="bico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><rect x="3" y="7" width="16" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="20" y="10" width="2" height="4" rx="1" fill="currentColor"/><path d="M11.5 8.5 8.5 12.5h2.6L10.4 15.5l3.2-4h-2.6z" fill="currentColor"/></svg>';
function updateBattery(){
  var el=document.getElementById('bmain');if(!el||!S.battery)return;
  var now=Date.now(),b=batNow(now);
  var ms=msTo(CAP,b.cur);
  el.innerHTML=BAT_SVG+'電量 <b>'+b.cur+'</b>/'+CAP+'<br><span class="bsub">'+(ms===0?'已滿':'滿電還要 '+dur2(ms)+'（約 '+dayPart(now+ms)+'）')+'</span>';
  document.getElementById('bfill').style.width=Math.min(100,b.cur/CAP*100)+'%';
  var bn=document.getElementById('bnote');
  if(bn){var ad=new Date(b.at+8*3600000),p=function(n){return ('0'+n).slice(-2);};
   var stale=now-b.at>6*3600000;
   bn.textContent='讀數 '+b.v+'，時間 '+p(ad.getUTCHours())+':'+p(ad.getUTCMinutes())+'（台北）。電量為估算，已自動同步 HoYoLAB（約每 30 分鐘），用掉後也可手動更新'+(stale?'；讀數已超過 6 小時':'');
   bn.style.color=stale?'#c0392b':'';bn.style.opacity=stale?'1':'.75';}
}
function icsStamp(ms){return new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');}
function makeIcs(T,startMs,title){
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//zzz-dashboard//TW','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
   'UID:zzz-battery-'+T+'-'+startMs+'@zzz-dashboard','DTSTAMP:'+icsStamp(Date.now()),'DTSTART:'+icsStamp(startMs),'DTEND:'+icsStamp(startMs+15*60000),
   'SUMMARY:'+title,'DESCRIPTION:絕區零電量預計已達 '+T,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+title,'TRIGGER:PT0S','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n';
}
function makeAlarm(T,out){
  out.style.color='';out.textContent='';
  var b=batNow(),now=Date.now();
  if(b.cur>=T){out.textContent='已達 '+T+'（目前 '+b.cur+'）';return;}
  var start=b.at+Math.max(0,T-b.v)*MIN6;
  var title='絕區零電量滿 '+T,when=tpDate(start)+' '+hm(start).replace('明天 ','');
  var ics=makeIcs(T,start,title);
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));
  a.download='zzz-battery-'+T+'.ics';a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);},1000);
  var g='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(title)+'&dates='+icsStamp(start)+'/'+icsStamp(start+15*60000)+'&details='+encodeURIComponent('絕區零電量預計已達 '+T);
  out.innerHTML='預計 '+when+'（台北）達 '+T+'。若沒跳出加入行事曆，改用 <a target="_blank" rel="noopener" href="'+g+'">Google 行事曆</a>';
}
function bf2(){return document.getElementById('bform');}
function initBattery(){
  var el=document.getElementById('bat');if(!el)return;
  el.innerHTML='<div id="btap" class="btap" role="button" tabindex="0" aria-expanded="false" aria-label="點此更新電量"><div class="brow"><div id="bmain" class="bmain"></div><div id="game" class="game"></div></div>'+
   '<div class="bbar"><i id="bfill"></i></div><div class="bhint">點此更新電量</div></div>'+
   '<form id="bform" class="bblk bform" hidden novalidate><label class="bl" for="bin">遊戲裡現在的電量</label> <input id="bin" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="240" placeholder="留空＝同步"> <button type="submit" class="mini" id="bset">確認</button> <button type="button" class="mini" id="bcx">取消</button></form>'+
   '<div id="bok" class="bres" aria-live="polite"></div>'+
   '<div class="bblk"><button class="mini" id="bal" type="button">滿 <span id="balt">200</span> 時提醒我</button> <input id="bai" type="number" min="1" max="'+CAP+'" placeholder="200" aria-label="提醒目標電量"></div>'+
   '<div id="bar" class="bres" aria-live="polite"></div>'+
   '<div id="bnote" class="small"></div>';
  var bai=document.getElementById('bai');
  bai.value=S.alarmTarget&&S.alarmTarget!==200?S.alarmTarget:'';
  function alT(){var v=parseInt(bai.value,10);return v>=1&&v<=CAP?v:200;}
  bai.oninput=function(){var t=alT();S.alarmTarget=t;save();document.getElementById('balt').textContent=t;};
  document.getElementById('balt').textContent=alT();
  document.getElementById('bal').onclick=function(){makeAlarm(alT(),document.getElementById('bar'));};
  var bin=document.getElementById('bin');
  function setR(){
    var ok=document.getElementById('bok'),raw=String(bin.value).trim();
    if(raw===''){syncHoyolab(ok);return;}
    var v=Number(raw);
    if(raw===''||!/^\d+$/.test(raw)||v<0||v>CAP){ok.textContent='請輸入 0 到 '+CAP+' 的整數';ok.style.color='#d9644a';return;}
    S.battery={value:v,at:nowISO()};save();bin.value='';bf2().hidden=true;document.getElementById('btap').setAttribute('aria-expanded','false');updateBattery();
    ok.textContent='已更新為 '+v+'/'+CAP;ok.style.color='#7fb08a';
  }
  var bf=document.getElementById('bform'),bt=document.getElementById('btap');
  function tog(open){bf.hidden=!open;bt.setAttribute('aria-expanded',open?'true':'false');if(open){document.getElementById('bok').textContent='留空直接按確認＝向 HoYoLAB 同步；輸入 0 到 '+CAP+' 則直接儲存';document.getElementById('bok').style.color='';bin.focus();}}
  var gw=document.getElementById('game');['click','keydown','keyup','touchstart'].forEach(function(t){gw.addEventListener(t,function(e){e.stopPropagation();});});
  bt.onclick=function(){tog(bf.hidden);};
  bt.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();tog(bf.hidden);}};
  document.getElementById('bcx').onclick=function(){bin.value='';bf.hidden=true;bt.setAttribute('aria-expanded','false');document.getElementById('bok').textContent='';};
  bf.onsubmit=function(e){e.preventDefault();setR();};
  updateBattery();
  if(typeof setInterval==='function')setInterval(updateBattery,30000);
  pullRemote();
  if(typeof setInterval==='function')setInterval(pullRemote,5*60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)pullRemote();});
}
function pullRemote(){
  if(typeof fetch!=='function')return;
  fetch('battery.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
    if(!j||!Number.isInteger(j.value)||j.value<0||j.value>CAP||(j.max&&j.max!==CAP))return;
    var t=Date.parse(j.at||'');if(isNaN(t)||t>Date.now()+60000)return;
    if(S.battery&&Date.parse(S.battery.at)>=t)return;
    S.battery={value:j.value,at:new Date(t).toISOString()};save();updateBattery();
  }).catch(function(){});
}

/* ---------- HoYoLAB sync via Scriptable ---------- */
var DEFAULT_SCRIPT='絕區零電量';
var BERR={auth:'HoYoLAB 憑證失效，請在 Scriptable 重新設定憑證',note:'請在 HoYoLAB App 開啟絕區零的即時便箋',verify:'HoYoLAB 要求驗證，請稍後再試',network:'連線 HoYoLAB 失敗，請檢查網路後再試',setup:'Scriptable 尚未設定憑證或 UID，請先在 Scriptable 內執行腳本',format:'HoYoLAB 回傳格式不符',unknown:'同步失敗，請改為手動輸入'};
function scriptName(){var v='';try{v=localStorage.getItem('zzz-script')||'';}catch(e){}return v||DEFAULT_SCRIPT;}
function isMobile(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function syncUrl(){
  var ret=location.origin+location.pathname;
  return 'scriptable:///run/'+encodeURIComponent(scriptName())+'?sync=1&return='+encodeURIComponent(ret);
}
function syncHoyolab(ok){
  ok.style.color='';
  if(!isMobile()){ok.textContent='電腦上無法同步，請手動輸入';ok.style.color='#d9644a';return;}
  ok.textContent='正在向 HoYoLAB 同步…';
  var left=false,onL=function(){if(document.hidden)left=true;};
  document.addEventListener('visibilitychange',onL);
  window.addEventListener('pagehide',function(){left=true;},{once:true});
  window.location.href=syncUrl();
  setTimeout(function(){
    document.removeEventListener('visibilitychange',onL);
    if(left||document.hidden)return;
    ok.textContent='沒有切換到 Scriptable，請確認已安裝並已建立腳本';ok.style.color='#d9644a';
  },1500);
}
function handleSyncParams(){
  var qs=location.search;if(!qs||qs.length<2)return;
  var p;try{p=new URLSearchParams(qs);}catch(e){return;}
  var hasB=p.has('battery'),hasE=p.has('batteryError');
  if(!hasB&&!hasE)return;
  var msg='',good=false;
  if(hasE){var c=p.get('batteryError');msg=BERR[c]||BERR.unknown;}
  else{
    var raw=p.get('battery'),at=p.get('at'),t=Date.parse(at||'');
    var mx=p.get('max');
    if(!/^\d{1,3}$/.test(raw||'')||Number(raw)>CAP)msg='同步資料無效：電量不在 0 到 '+CAP+' 之間';
    else if(mx!==null&&Number(mx)!==CAP)msg='同步資料無效：電量上限不符';
    else if(!/^\d{4}-\d\d-\d\dT/.test(at||'')||isNaN(t))msg='同步資料無效：時間格式錯誤';
    else if(t>Date.now()+60000)msg='同步資料無效：時間在未來';
    else{
      var v=Number(raw);
      S.battery={value:v,at:new Date(t).toISOString()};save();
      msg='已從 HoYoLAB 同步為 '+v+'/'+CAP;good=true;
    }
  }
  try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  var ok=document.getElementById('bok');
  if(ok){ok.textContent=msg;ok.style.color=good?'#7fb08a':'#d9644a';}
  updateBattery();
}

/* ---------- open game ---------- */
var DEFAULT_SHORTCUT='打開絕區零';
var UNI_URL='https://oig.hoyoverse.com/zenlessglobal/';
var STORE_URL='https://apps.apple.com/tw/app/zenless-zone-zero/id1606356401';
var SCHEMES=['nap://','com.hoyoverse.nap://','zenlesszonezero://','zzz://','zenlessglobal://'];
function lsGet(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}}
function lsSet(k,v){try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);}catch(e){}}
/* one-time migration: old default (shortcut) -> universal link */
(function(){
  if(lsGet('zzz-launch-v')!=='2'){
    if(lsGet('zzz-method')!=='custom')lsSet('zzz-method','');
    lsSet('zzz-shortcut',lsGet('zzz-shortcut')==='開絕區零'?'':lsGet('zzz-shortcut'));
    lsSet('zzz-launch-v','2');
  }
})();
function gameMethod(){var m=lsGet('zzz-method');return m==='shortcut'||m==='custom'||m==='schemes'?m:'universal';}
function shortcutName(){return lsGet('zzz-shortcut')||DEFAULT_SHORTCUT;}
function gameUrl(){
  var m=gameMethod();
  if(m==='custom'){var v=lsGet('zzz-custom').trim();if(v&&v.indexOf(':')<0)v+='://';return v;}
  if(m==='shortcut')return 'shortcuts://run-shortcut?name='+encodeURIComponent(shortcutName());
  return UNI_URL;
}
function initGame(){
  var el=document.getElementById('game');if(!el)return;
  el.innerHTML='<a id="gbtn" class="gbtn" href="'+UNI_URL+'" aria-label="開啟遊戲">開啟遊戲</a> <button id="gset" class="mini">設定</button>'+
   '<div id="gset-box" class="gbox" hidden>'+
   '<div class="small">開啟遊戲的方式</div>'+
   '<label class="small"><input type="radio" name="gm" value="universal"> 通用連結（預設）</label> '+
   '<label class="small"><input type="radio" name="gm" value="schemes"> 試 scheme 依序嘗試（未驗證的猜測）</label> '+
   '<label class="small"><input type="radio" name="gm" value="shortcut"> 捷徑</label> '+
   '<label class="small"><input type="radio" name="gm" value="custom"> 自訂連結</label>'+
   '<div class="small">通用連結：若點一下開的是 Safari 而不是 App，請長按 LOGO 或按鈕，選「在「絕區零」中打開」一次，iOS 會記住。貼到網址列不會生效，必須是點擊連結。</div>'+
   '<div class="small">試 scheme：依序嘗試 '+SCHEMES.join('、')+'，每個間隔約 0.8 秒。這些全是未驗證的猜測，不保證存在。</div>'+
   '<label class="small">捷徑名稱 <input id="gsc" class="wide" value=""></label>'+
   '<label class="small">自訂連結（任何 scheme） <input id="gcu" class="wide" value="" placeholder="例如 myapp://"></label>'+
   '<label class="small">Scriptable 腳本名稱（同步電量用） <input id="gscr" class="wide" value=""></label>'+
   '<div class="small">腳本名稱需與 Scriptable 內完全相同，預設「'+DEFAULT_SCRIPT+'」。捷徑建立方式：開啟捷徑 App → 新增捷徑 → 加入「打開 App」→ 選絕區零 → 命名為「'+DEFAULT_SHORTCUT+'」。只在 iPhone / Android 有效。</div>'+
   '<button class="mini" id="gdef">還原預設</button></div><div id="gmsg" class="small" hidden></div>';
  var box=document.getElementById('gset-box'),msg=document.getElementById('gmsg');
  var sc=document.getElementById('gsc'),cu=document.getElementById('gcu'),scr=document.getElementById('gscr');
  var gb=document.getElementById('gbtn'),lb=document.getElementById('logobtn');
  function fill(){
    sc.value=shortcutName();cu.value=lsGet('zzz-custom');scr.value=scriptName();
    [].forEach.call(box.querySelectorAll('input[name=gm]'),function(r){r.checked=r.value===gameMethod();});
  }
  fill();
  [].forEach.call(box.querySelectorAll('input[name=gm]'),function(r){r.onchange=function(){lsSet('zzz-method',r.value==='universal'?'':r.value);};});
  sc.onchange=function(){var v=sc.value.trim();lsSet('zzz-shortcut',v&&v!==DEFAULT_SHORTCUT?v:'');if(!v)sc.value=DEFAULT_SHORTCUT;};
  cu.onchange=function(){lsSet('zzz-custom',cu.value.trim());};
  scr.onchange=function(){var v=scr.value.trim();lsSet('zzz-script',v&&v!==DEFAULT_SCRIPT?v:'');if(!v)scr.value=DEFAULT_SCRIPT;};
  document.getElementById('gdef').onclick=function(){['zzz-method','zzz-shortcut','zzz-custom','zzz-script','zzz-scheme'].forEach(function(k){lsSet(k,'');});fill();};
  document.getElementById('gset').onclick=function(){box.hidden=!box.hidden;};
  function helpHtml(){
    var m=gameMethod();
    var h='沒有開啟遊戲。';
    if(m==='universal')h+='若開的是 Safari 而不是 App：長按 LOGO 或按鈕，選「在「絕區零」中打開」一次。';
    else if(m==='shortcut')h+='請先建立捷徑：開啟捷徑 App → 新增捷徑 → 加入「打開 App」→ 選絕區零 → 命名為「'+esc(shortcutName())+'」。';
    return h+'<div><a class="mini" href="https://www.icloud.com/shortcuts/7e11547991bd4962808b3396c724c63f">加入現成捷徑</a> <button type="button" class="mini" id="gsch">試 scheme（未驗證）</button> <a class="mini" href="'+STORE_URL+'">前往 App Store</a></div>';
  }
  function watch(){
    var st={left:false};
    var onL=function(){if(document.hidden)st.left=true;},onP=function(){st.left=true;};
    document.addEventListener('visibilitychange',onL);window.addEventListener('pagehide',onP);
    st.stop=function(){document.removeEventListener('visibilitychange',onL);window.removeEventListener('pagehide',onP);};
    return st;
  }
  function trySchemes(){
    var i=0,w=watch();msg.hidden=false;
    (function next(){
      if(w.left||document.hidden){w.stop();var ok=SCHEMES[Math.max(0,i-1)];
        msg.innerHTML='可能是 <b>'+esc(ok)+'</b> 成功開啟了遊戲（未驗證的猜測）。 <button type="button" class="mini" id="gsave">記住這個（存成自訂連結）</button>';
        var sv=document.getElementById('gsave');
        if(sv)sv.onclick=function(){lsSet('zzz-custom',ok);lsSet('zzz-method','custom');cu.value=ok;fill();msg.textContent='已記住 '+ok+'，之後改用自訂連結。';};
        return;}
      if(i>=SCHEMES.length){w.stop();msg.innerHTML='全部 scheme 都沒有反應（皆為未驗證的猜測）。'+helpHtml();bindSch();return;}
      msg.textContent='試 '+SCHEMES[i]+'（'+(i+1)+'/'+SCHEMES.length+'，未驗證的猜測）…';
      try{window.location.href=SCHEMES[i];}catch(e){}
      i++;setTimeout(next,800);
    })();
  }
  function bindSch(){var g=document.getElementById('gsch');if(g)g.onclick=trySchemes;}
  function hint(){
    var w=watch();
    setTimeout(function(){w.stop();if(w.left||document.hidden){msg.hidden=true;return;}msg.hidden=false;msg.innerHTML=helpHtml();bindSch();},1500);
  }
  var onTap=function(e){
    box.hidden=true;
    var m=gameMethod();
    if(m==='universal'){hint();return;}            /* native anchor navigation, no interception */
    e.preventDefault();
    if(!isMobile()&&!/Android/.test(navigator.userAgent)){msg.hidden=false;msg.textContent='電腦上無法開啟遊戲，請在手機使用。';return;}
    if(m==='schemes'){trySchemes();return;}
    var url=gameUrl();
    if(!url){msg.hidden=false;msg.textContent='尚未填寫自訂連結，請到設定填寫。';return;}
    msg.hidden=false;msg.textContent='正在開啟遊戲…';
    window.location.href=url;hint();
  };
  [gb,lb].forEach(function(a){if(a)a.addEventListener('click',onTap);});
  window.launchGame=function(){onTap({preventDefault:function(){}});};
}

/* ---------- backup notice ---------- */
function backupNotice(){
  var base=Date.parse(S.lastExport||S.created);if(isNaN(base))return '';
  var days=Math.floor((Date.now()-base)/864e5);
  if(days<=30)return '';
  return '<div class="note">'+(S.lastExport?'距離上次匯出備份已 '+days+' 天':'已 '+days+' 天沒有匯出備份')+'，建議到<a href="#/data">資料頁</a>匯出一份 JSON。</div>';
}

/* ---------- new views ---------- */
function vNextOverview(E){
  var l=S.agents.map(function(a,i){return{a:a,e:evalAgent(a)};}).filter(function(x){return x.a.priority==='主力';});
  var h='<h2>主力下一步</h2>';
  if(!l.length)return h+'<div class="card small">尚未指定主力。到代理人頁面把優先度改成「主力」，這裡就會列出每位的下一步。</div>';
  return h+'<div class="card">'+l.map(function(x){return '<div class="row"><a href="#/agent/'+x.a.index+'" style="color:inherit"><b>'+esc(x.a.name)+'</b> <span class="small">'+esc(x.e.bt)+'</span></a><span style="text-align:right;color:var(--a)">'+esc(nextOf(x.a,x.e))+'</span></div>';}).join('')+'</div>';
}
function vRoleCard(a,e,P){
  var h='';
  h+='<h2>角色評分與有效詞條</h2><div class="card">'+
   '<div class="row"><label>建置類型</label><select data-p="'+P+'.build"><option value="">自動判斷（'+esc(inferBuild(a))+'）</option>'+BT.map(function(t){return '<option'+(a.build===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
   '<div class="row"><label>角色分數（'+esc(e.bt)+'）</label><span>'+e.rs+'</span></div>'+bar(e.rs)+
   '<div class="row"><label>驅動盤平均有效詞條</label><span>'+e.effPct+'%</span></div>';
  var d=discs(a);
  d.forEach(function(x,i){
    var sl=x.slot||i+1,p=e.discEff[sl];
    h+='<div class="row"><label>第 '+sl+' 號位 '+esc(x.set)+'</label><span>'+(p==null?'<span class="small">Lv0 或無詞條</span>':p+'%'+(p<LOWPCT?' <span class="flag">偏低</span>':''))+'</span></div>';
  });
  var W0=W[e.bt]||{};
  h+='<div class="small" style="margin-top:6px">'+esc(e.bt)+'的有效詞條權重：'+esc(Object.keys(W0).map(function(k){return k.replace('%','（%）')+' '+W0[k];}).join('、'))+'。有效度 = 該盤副詞條平均權重 / 0.7，低於 '+LOWPCT+'% 視為偏低。</div></div>';
  h+='<h2>下一步</h2><div class="card"><div class="small">自動建議：'+esc(e.next)+'</div>'+
   '<input class="wide" data-p="'+P+'.next" value="'+esc(a.next||'')+'" placeholder="留空則使用自動建議">'+
   '<div class="tools" style="margin:8px 0 0"><button data-apply="'+P.split('.')[1]+'">套用建議到欄位</button><button data-clear="'+P.split('.')[1]+'">清除（改用自動）</button></div></div>';
  return h;
}
function delBtn(path){return '<button class="mini" data-del="'+path+'">刪除</button>';}
function vDaily(){
  var sets=Object.keys(S.set_effects||{});
  var h='<h1>每日打卡</h1><div class="card"><div class="tools" style="margin:0">'+
   '<input type="date" id="dd" value="'+tpDate(Date.now())+'">'+
   '<input type="number" id="du" min="0" placeholder="使用電量">'+
   '<input id="ds" list="dsl" placeholder="刷的驅動盤套裝">'+
   '<datalist id="dsl">'+sets.map(function(x){return '<option value="'+esc(x)+'">';}).join('')+'</datalist>'+
   '<input type="number" id="dk" min="0" placeholder="有用掉落數">'+
   '<input id="dn" placeholder="備註" style="flex:1;min-width:140px">'+
   '<button id="dadd">新增打卡</button></div></div>';
  var c=S.checkins.map(function(x,i){return{x:x,i:i};}).sort(function(a,b){return String(b.x.date).localeCompare(String(a.x.date))||b.i-a.i;});
  var wk=c.filter(function(o){return dayDiff(o.x.date)>-7;});
  h+='<p class="small">近 7 天：打卡 '+wk.length+' 次，使用電量 '+wk.reduce(function(t,o){return t+num(o.x.used);},0)+'，有用掉落 '+wk.reduce(function(t,o){return t+num(o.x.drops);},0)+'。</p>';
  h+='<h2>歷史</h2>';
  if(!c.length)return h+'<div class="card small">還沒有打卡紀錄。</div>';
  h+='<div class="tw"><table><thead><tr><th>日期</th><th>使用電量</th><th>套裝</th><th>有用掉落</th><th>備註</th><th></th></tr></thead><tbody>'+
   c.map(function(o){var x=o.x;return '<tr><td>'+esc(x.date)+'</td><td>'+esc(x.used)+'</td><td>'+esc(x.set)+'</td><td>'+esc(x.drops)+'</td><td style="white-space:normal">'+esc(x.note)+'</td><td>'+delBtn('checkins.'+o.i)+'</td></tr>';}).join('')+'</tbody></table></div>';
  return h;
}
function bindDaily(){
  document.getElementById('dadd').onclick=function(){
    var g=function(i){return document.getElementById(i).value;};
    S.checkins.push({id:uid(),date:g('dd')||tpDate(Date.now()),used:g('du'),set:g('ds'),drops:g('dk'),note:g('dn')});
    save();render(true);
  };
}
function vGoals(){
  var h='<h1>每週目標</h1><div class="card"><div class="tools" style="margin:0"><input id="gt" placeholder="目標內容" style="flex:1;min-width:160px"><input type="date" id="gd"><button id="gadd">新增目標</button></div></div><h2>清單</h2>';
  if(!S.goals.length)return h+'<div class="card small">還沒有目標。</div>';
  var l=S.goals.map(function(g,i){return{g:g,i:i};}).sort(function(a,b){return (a.g.done?1:0)-(b.g.done?1:0)||String(a.g.date||'9').localeCompare(String(b.g.date||'9'));});
  h+='<div class="card">'+l.map(function(o){
    var g=o.g,p='goals.'+o.i,cd='';
    if(g.date){var n=dayDiff(g.date);cd=g.done?'':(n<0?'<span style="color:var(--r)">已過期 '+(-n)+' 天</span>':n===0?'<span style="color:var(--w)">今天到期</span>':'還有 '+n+' 天');}
    return '<div class="row"><input type="checkbox" data-ck="'+p+'.done"'+(g.done?' checked':'')+' style="width:auto"><input data-p="'+p+'.text" value="'+esc(g.text)+'" style="flex:1;text-align:left;width:auto;min-width:0'+(g.done?';text-decoration:line-through;color:var(--m)':'')+'"><input type="date" data-p="'+p+'.date" value="'+esc(g.date||'')+'" style="width:auto"><span class="small" style="min-width:80px;text-align:right">'+cd+'</span>'+delBtn(p)+'</div>';}).join('')+'</div>';
  return h;
}
function bindGoals(){
  document.getElementById('gadd').onclick=function(){
    var t=document.getElementById('gt').value.trim();if(!t)return;
    S.goals.push({id:uid(),text:t,date:document.getElementById('gd').value,done:false});save();render(true);
  };
}
var EVT=['活動','卡池','其他'];
function evStatus(e){
  if(!e.start&&!e.end)return '';
  var n=e.start?dayDiff(e.start):-1,m=e.end?dayDiff(e.end):null;
  if(n>0)return n+' 天後開始';
  if(m===null)return n===0?'今天開始':'已開始';
  if(m<0)return '<span class="small">已結束</span>';
  return '進行中，'+(m===0?'今天結束':m+' 天後結束');
}
function vEvents(){
  var h='<h1>活動與卡池日曆</h1><p class="small">手動維護，不會連到外部資料。日期以台北時間計算。</p><div class="card"><div class="tools" style="margin:0"><input id="en" placeholder="名稱" style="flex:1;min-width:140px"><select id="et">'+EVT.map(function(t){return '<option>'+t+'</option>';}).join('')+'</select><label class="small">開始 <input type="date" id="es"></label><label class="small">結束 <input type="date" id="ee"></label><button id="eadd">新增</button></div></div><h2>清單</h2>';
  if(!S.events.length)return h+'<div class="card small">還沒有項目。</div>';
  var l=S.events.map(function(e,i){return{e:e,i:i};}).sort(function(a,b){var ea=a.e.end&&dayDiff(a.e.end)<0,eb=b.e.end&&dayDiff(b.e.end)<0;return (ea?1:0)-(eb?1:0)||String(a.e.start||a.e.end||'9').localeCompare(String(b.e.start||b.e.end||'9'));});
  h+='<div class="card">'+l.map(function(o){var e=o.e,p='events.'+o.i;
    return '<div class="row" style="flex-wrap:wrap"><input data-p="'+p+'.name" value="'+esc(e.name)+'" style="flex:1;text-align:left;width:auto;min-width:120px"><select data-p="'+p+'.type">'+EVT.map(function(t){return '<option'+(e.type===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select><input type="date" data-p="'+p+'.start" value="'+esc(e.start||'')+'" style="width:auto"><input type="date" data-p="'+p+'.end" value="'+esc(e.end||'')+'" style="width:auto"><span class="small" style="min-width:110px;text-align:right">'+evStatus(e)+'</span>'+delBtn(p)+'</div>';}).join('')+'</div>';
  return h;
}
function bindEvents(){
  document.getElementById('eadd').onclick=function(){
    var n=document.getElementById('en').value.trim();if(!n)return;
    S.events.push({id:uid(),name:n,type:document.getElementById('et').value,start:document.getElementById('es').value,end:document.getElementById('ee').value});save();render(true);
  };
}
function bindCommon(){
  [].forEach.call(document.querySelectorAll('[data-del]'),function(b){b.onclick=function(){
    var p=b.getAttribute('data-del').split('.');S[p[0]].splice(parseInt(p[1],10),1);save();render(true);};});
  [].forEach.call(document.querySelectorAll('[data-ck]'),function(c){c.onchange=function(){setPath(c.getAttribute('data-ck'),c.checked);save();render(true);};});
}
function bindGeneric(){
  [].forEach.call(document.querySelectorAll('[data-p]'),function(el){el.onchange=function(){setPath(el.getAttribute('data-p'),el.value);save();render(true);};});
}

/* ---------- views ---------- */
function vOverview(){
  var A=S.agents,E=A.map(evalAgent),n=A.length;
  var noEng=A.filter(function(a){return !a.w_engine||!a.w_engine.name;}).length;
  var lowEng=A.filter(function(a){return a.w_engine&&a.w_engine.name&&lvn(a.w_engine.level)<60;}).length;
  var c0=E.reduce(function(s,e){return s+e.c0;},0);
  var avgSk=E.reduce(function(s,e){return s+e.skAvg;},0)/n;
  var avgSc=Math.round(E.reduce(function(s,e){return s+e.score;},0)/n);
  var att=E.filter(function(e){return e.flag;}).length;
  var m3=A.filter(function(a){return num(a.mindscape_lit)>=3;}).length;
  var pc={};PRI.forEach(function(p){pc[p]=A.filter(function(a){return a.priority===p;}).length;});
  function t(l,v,cls,href){return '<div class="tile '+(cls||'')+'"><a href="'+(href||'#/agents')+'"><div class="n">'+v+'</div><div class="l">'+l+'</div></a></div>';}
  var h='<h1>ZZZ 練度總覽</h1><div class="tiles">'+
   t('代理人總數',n)+t('平均建置分數',avgSc)+t('平均技能等級',avgSk.toFixed(1))+
   t('需要注意',att,att?'warn':'','#/agents?f=attn')+
   t('未裝備音擎',noEng,noEng?'warn':'','#/agents?f=noeng')+
   t('音擎未滿 60',lowEng,lowEng?'warn':'')+
   t('Lv0 驅動盤',c0,c0?'warn':'','#/agents?f=disc0')+
   t('影畫 3 以上',m3)+
   t('邦布數量',(S.bangboo||[]).length)+'</div>';
  h+='<h2>優先度分布</h2><div class="tiles">'+PRI.map(function(p){return t(p,pc[p],'','#/agents?p='+encodeURIComponent(p));}).join('')+'</div>';
  var o=S.overview||{};
  if(o.stats){
    h+='<h2>帳號紀錄</h2><div class="tiles">';
    if(o.level)h+=t('繩網等級',esc(o.level),'','#/');
    Object.keys(o.stats).forEach(function(k){h+=t(esc(k),esc(o.stats[k]),'','#/');});
    h+='</div>';
  }
  var top=A.map(function(a,i){return{a:a,e:E[i]};}).sort(function(x,y){return x.e.score-y.e.score;}).slice(0,5);
  h+='<h2>建置分數最低 5 位</h2><div class="card">'+top.map(function(x){return '<div class="row"><a href="#/agent/'+x.a.index+'" style="color:inherit">'+esc(x.a.name)+'</a><span>'+x.e.score+'</span></div>';}).join('')+'</div>';
  h+=vNextOverview(E);
  h+='<p class="small">建置分數：音擎 30、驅動盤 Lv15 數量 40、技能 15、暴擊 15（滿分 100）。純異常或支援角色的暴擊項會偏低，僅供參考。</p>';
  return h;
}

var sortK='score',sortD=1,filt={q:'',f:'',p:''};
function vAgents(q){
  if(q){filt.f=q.f||'';filt.p=q.p||'';}
  var rows=S.agents.map(function(a){var e=evalAgent(a);return{a:a,e:e,
    v:{bt:e.bt,rs:e.rs,index:a.index,name:a.name,mind:num(a.mindscape_lit),pri:PRI.indexOf(a.priority),score:e.score,
       eng:a.w_engine&&a.w_engine.name?lvn(a.w_engine.level):-1,c15:e.c15,sk:e.skAvg,cr:e.cr,cd:e.cd,atk:num(fin(a,'攻擊力')),flag:e.flag?1:0}};});
  rows=rows.filter(function(r){
    if(filt.q&&r.a.name.indexOf(filt.q)<0)return false;
    if(filt.p&&r.a.priority!==filt.p)return false;
    if(filt.f==='attn'&&!r.e.flag)return false;
    if(filt.f==='noeng'&&r.v.eng>=0)return false;
    if(filt.f==='lowEng'&&r.v.eng>=60)return false;
    if(filt.f==='disc0'&&!r.e.c0)return false;
    return true;});
  rows.sort(function(x,y){var a=x.v[sortK],b=y.v[sortK];if(typeof a==='string')return a.localeCompare(b,'zh-Hant')*sortD;return (a-b)*sortD||x.v.index-y.v.index;});
  var cols=[['name','名稱'],['pri','優先度'],['mind','影畫'],['score','通用建置分'],['bt','類型'],['rs','角色分'],['eng','音擎'],['c15','Lv15 盤'],['sk','技能均'],['cr','暴擊率'],['cd','暴擊傷害'],['atk','攻擊力'],['flag','狀態']];
  var h='<h1>代理人 <span class="small">'+rows.length+' / '+S.agents.length+'</span></h1><div class="tools">'+
   '<input id="fq" placeholder="搜尋名稱" value="'+esc(filt.q)+'">'+
   '<select id="ff"><option value="">全部</option>'+[['attn','需要注意'],['noeng','未裝備音擎'],['lowEng','音擎未滿 60'],['disc0','有 Lv0 驅動盤']].map(function(o){return '<option value="'+o[0]+'"'+(filt.f===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+
   '<select id="fp"><option value="">全部優先度</option>'+PRI.map(function(p){return '<option'+(filt.p===p?' selected':'')+'>'+p+'</option>';}).join('')+'</select></div>'+
   '<div class="tw"><table><thead><tr>'+cols.map(function(c){return '<th data-k="'+c[0]+'">'+c[1]+(sortK===c[0]?(sortD>0?' ▲':' ▼'):'')+'</th>';}).join('')+'</tr></thead><tbody>'+
   rows.map(function(r){var a=r.a,e=r.e;return '<tr><td><a href="#/agent/'+a.index+'">'+esc(a.name)+'</a></td><td>'+esc(a.priority)+'</td><td>'+r.v.mind+'</td><td><div style="display:flex;gap:6px;align-items:center">'+e.score+bar(e.score)+'</div></td><td>'+esc(e.bt)+'</td><td>'+e.rs+'</td><td>'+(r.v.eng<0?'無':'Lv'+r.v.eng)+'</td><td>'+e.c15+' / 6</td><td>'+e.skAvg.toFixed(1)+'</td><td>'+esc(fin(a,'暴擊率'))+'</td><td>'+esc(fin(a,'暴擊傷害'))+'</td><td>'+esc(fin(a,'攻擊力'))+'</td><td>'+(e.flag?'<span class="flag">需注意</span>':'')+'</td></tr>';}).join('')+'</tbody></table></div>';
  return h;
}
function bindAgents(){
  var q=document.getElementById('fq');
  q.oninput=function(){filt.q=q.value;var p=q.selectionStart;render(true);var n=document.getElementById('fq');n.focus();n.setSelectionRange(p,p);};
  document.getElementById('ff').onchange=function(){filt.f=this.value;render(true);};
  document.getElementById('fp').onchange=function(){filt.p=this.value;render(true);};
  [].forEach.call(document.querySelectorAll('th[data-k]'),function(th){th.onclick=function(){var k=th.getAttribute('data-k');if(sortK===k)sortD=-sortD;else{sortK=k;sortD=(k==='name'||k==='pri')?1:-1;if(k==='score'||k==='flag')sortD=k==='flag'?-1:1;}render(true);};});
}

function inp(path,val,cls){return '<input data-p="'+esc(path)+'" class="'+(cls||'')+'" value="'+esc(val)+'">';}
function vAgent(id){
  var a=agentById(id);if(!a)return '<p>找不到代理人。</p><a class="back" href="#/agents">返回列表</a>';
  var e=evalAgent(a),ix=S.agents.indexOf(a),P='agents.'+ix;
  var h='<a class="back" href="#/agents">← 代理人列表</a><h1 style="margin-top:8px">'+esc(a.name)+' '+(e.flag?'<span class="flag">需注意</span>':'')+'</h1>';
  h+='<div class="grid2"><div class="card"><div class="row"><label>優先度</label><select data-p="'+P+'.priority">'+PRI.map(function(p){return '<option'+(a.priority===p?' selected':'')+'>'+p+'</option>';}).join('')+'</select></div>'+
   '<div class="row"><label>通用建置分數</label><span>'+e.score+'</span></div>'+bar(e.score)+
   '<div class="row"><label>名稱</label>'+inp(P+'.name',a.name)+'</div>'+
   '<div class="row"><label>等級</label>'+inp(P+'.level',a.level)+'</div>'+
   '<div class="row"><label>影畫（亮起數）</label>'+inp(P+'.mindscape_lit',a.mindscape_lit)+'</div>'+
   '<label class="small">備註</label><textarea data-p="'+P+'.note">'+esc(a.note||'')+'</textarea></div>';
  h+='<div class="card"><div class="small">缺口</div>'+(e.gaps.length?'<ul class="gap">'+e.gaps.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul>':'<div style="color:var(--g)">無明顯缺口</div>')+'</div></div>';
  h+=vRoleCard(a,e,P);
  h+='<h2>技能</h2><div class="card">'+SK.map(function(k){return '<div class="row"><label>'+k+'</label>'+inp(P+'.skills.'+k,(a.skills||{})[k])+'</div>';}).join('')+'</div>';
  if(!a.w_engine)a.w_engine=null;
  var w=a.w_engine||{};var WP=P+'.w_engine';
  h+='<h2>音擎</h2><div class="card">'+(a.w_engine&&w.name?'':'<div class="small" style="margin-bottom:6px">目前未裝備，填入名稱即可建立。</div>')+
   '<div class="row"><label>名稱</label>'+inp(WP+'.name',w.name)+'</div>'+
   '<div class="row"><label>等級</label>'+inp(WP+'.level',w.level)+'</div>'+
   '<div class="row"><label>精煉（亮星數 / '+(w.refine_stars_total||5)+'）</label>'+inp(WP+'.refine_stars_lit',w.refine_stars_lit)+'</div>'+
   '<div class="row"><label>基礎攻擊力</label>'+inp(WP+'.base_stat.基礎攻擊力',(w.base_stat||{})['基礎攻擊力'])+'</div>'+
   '<div class="row"><label>進階屬性</label><span>'+esc(Object.keys(w.sub_stat||{}).map(function(k){return k+' '+w.sub_stat[k];}).join('，'))+'</span></div>'+
   (w.effect?'<div class="small" style="margin-top:6px">'+esc(w.effect)+'</div>':'')+'</div>';
  h+='<h2>驅動盤</h2><div class="grid2">';
  for(var i=0;i<Math.max(6,discs(a).length);i++){
    var d=discs(a)[i];
    if(!d){h+='<div class="card disc lv0"><div class="small">位置 '+(i+1)+'：空缺</div></div>';continue;}
    var DP=P+'.drive_discs.'+i,mk=Object.keys(d.main_stat||{})[0]||'';
    h+='<div class="card disc'+(lvn(d.level)===0?' lv0':'')+'"><div class="hd"><span class="small">位置 '+d.slot+'</span>'+inp(DP+'.set',d.set,'set')+inp(DP+'.level',d.level,'lv')+'</div>'+
     '<div class="sub"><input data-mk="'+DP+'" value="'+esc(mk)+'"><input data-p="'+DP+'.main_stat.'+esc(mk)+'" value="'+esc((d.main_stat||{})[mk])+'"></div><div class="small" style="margin:4px 0">副詞條</div>';
    (d.substats||[]).forEach(function(s,j){h+='<div class="sub">'+inp(DP+'.substats.'+j+'.stat',s.stat)+inp(DP+'.substats.'+j+'.value',s.value)+'</div>';});
    h+='</div>';
  }
  h+='</div>';
  var fs=a.final_stats||{},keys=Object.keys(fs);
  DS.forEach(function(k){if(keys.indexOf(k)<0)keys.push(k);});
  h+='<h2>最終數值</h2><div class="card">'+keys.map(function(k){var v=fs[k]||[''];var li=v.length-1;return '<div class="row"><label>'+esc(k)+(v.length>1?' <span class="small">（基礎 '+esc(v[0])+' '+esc(v[1])+'）</span>':'')+'</label>'+inp(P+'.final_stats.'+k+'.'+li,v[li])+'</div>';}).join('')+
   (a.active_set_bonuses&&a.active_set_bonuses.length?'<div class="small" style="margin-top:8px">套裝效果：'+esc(a.active_set_bonuses.join('、'))+'</div>':'')+'</div>';
  return h;
}
function setPath(path,val){
  var p=path.split('.'),o=S;
  for(var i=0;i<p.length-1;i++){
    if(o[p[i]]==null||typeof o[p[i]]!=='object')o[p[i]]=/^\d+$/.test(p[i+1])?[]:{};
    o=o[p[i]];
  }
  o[p[p.length-1]]=val;
}
function bindAgent(){
  [].forEach.call(document.querySelectorAll('[data-p]'),function(el){
    el.onchange=function(){
      var p=el.getAttribute('data-p'),v=el.value;
      if(/\.w_engine\.name$/.test(p)&&v){var m=p.replace(/\.name$/,'');var ix=m.split('.')[1];var a=S.agents[ix];if(!a.w_engine)a.w_engine={level:'Lv.0',refine_stars_lit:0,refine_stars_total:5,base_stat:{},sub_stat:{}};}
      if(/\.(level)$/.test(p)&&/^\d+$/.test(v))v='Lv.'+v;
      if(/\.refine_stars_lit$|\.mindscape_lit$/.test(p)&&/^\d+$/.test(v))v=parseInt(v,10);
      setPath(p,v);save();render(true);
    };
  });
  [].forEach.call(document.querySelectorAll('[data-apply]'),function(b){b.onclick=function(){var i=b.getAttribute('data-apply'),a=S.agents[i];a.next=evalAgent(a).next;save();render(true);};});
  [].forEach.call(document.querySelectorAll('[data-clear]'),function(b){b.onclick=function(){S.agents[b.getAttribute('data-clear')].next='';save();render(true);};});
  [].forEach.call(document.querySelectorAll('[data-mk]'),function(el){
    el.onchange=function(){
      var DP=el.getAttribute('data-mk').split('.').slice(1);
      var d=S.agents[DP[0]].drive_discs[DP[2]];
      var ok=Object.keys(d.main_stat||{})[0],val=ok?d.main_stat[ok]:'';
      d.main_stat={};if(el.value)d.main_stat[el.value]=val;
      save();render(true);
    };
  });
}

function vTodo(){
  var n=parseInt(localStorage.getItem(KEY+'-todoN')||'0',10);
  var list=S.agents.filter(function(a){return a.priority!=='暫不養';}).map(function(a){return{a:a,e:evalAgent(a)};}).filter(function(x){return x.e.gaps.length;});
  list.sort(function(x,y){return PRI.indexOf(x.a.priority)-PRI.indexOf(y.a.priority)||x.e.score-y.e.score;});
  var h='<h1>待辦</h1><p class="small">依優先度（主力、養成中）排序，同級依建置分數由低到高；「暫不養」不列入。</p>';
  if(!list.length)return h+'<div class="card">目前沒有缺口。</div>';
  ['主力','養成中'].forEach(function(p){
    var l=list.filter(function(x){return x.a.priority===p;});
    if(!l.length)return;
    h+='<h2>'+p+'（'+l.length+'）</h2>';
    l.forEach(function(x){h+='<div class="card" style="margin-bottom:8px"><div class="row"><a href="#/agent/'+x.a.index+'" style="color:inherit"><b>'+esc(x.a.name)+'</b></a><span>'+x.e.score+'</span></div><div class="small" style="margin-top:4px">下一步：'+esc(nextOf(x.a,x.e))+'</div><ul class="gap">'+x.e.gaps.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul></div>';});
  });
  var noM=S.agents.filter(function(a){return a.priority==='主力';}).length;
  if(!noM)h+='<p class="small">尚未指定任何主力。到代理人頁面把優先度改成「主力」，這裡就會優先顯示。</p>';
  return h;
}
function vData(){
  return '<h1>資料</h1><div class="card"><p>資料只存在這個瀏覽器的 localStorage。換裝置或清除瀏覽器資料前，請先匯出備份。</p>'+
   '<div class="tools"><button id="bx">匯出 JSON</button><button id="bi">匯入 JSON</button><button id="br">重設為初始資料</button></div><input type="file" id="fi" accept=".json,application/json" style="display:none"><div id="msg" class="small"></div><p class="small">上次匯出：'+(S.lastExport?tpStamp(Date.parse(S.lastExport))+'（台北）':'尚未匯出')+'。匯出內容包含代理人、電量、打卡、目標與日曆。</p></div>';
}
function bindData(){
  var m=document.getElementById('msg');
  document.getElementById('bx').onclick=function(){
    S.lastExport=nowISO();save();
    var b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});
    var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='zzz-dashboard-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},1000);
    m.textContent='已匯出。';var nt=document.querySelector('.note');if(nt)nt.remove();
  };
  var fi=document.getElementById('fi');
  document.getElementById('bi').onclick=function(){fi.click();};
  fi.onchange=function(){
    var f=fi.files[0];if(!f)return;var r=new FileReader();
    r.onload=function(){try{var o=JSON.parse(r.result);if(!o||!Array.isArray(o.agents))throw new Error('缺少 agents');
      if(!confirm('匯入會覆蓋目前資料，確定嗎？'))return;S=ensure(o);save();m.textContent='匯入完成，共 '+o.agents.length+' 位代理人。';}catch(e){m.textContent='匯入失敗：'+e.message;}};
    r.readAsText(f);
  };
  document.getElementById('br').onclick=function(){if(confirm('所有修改都會消失，確定重設為初始資料嗎？')){S=fresh();save();updateBattery();m.textContent='已重設。';}};
}

function parse(){
  var h=location.hash.replace(/^#/,'')||'/';var qs={},i=h.indexOf('?');
  if(i>=0){h.slice(i+1).split('&').forEach(function(p){var kv=p.split('=');qs[kv[0]]=decodeURIComponent(kv[1]||'');});h=h.slice(0,i);}
  return{parts:h.split('/').filter(Boolean),qs:qs,raw:location.hash};
}
var lastRaw=null;
function render(keep){
  var r=parse(),app=document.getElementById('app'),sy=window.scrollY;
  var route=r.parts[0]||'';
  [].forEach.call(document.querySelectorAll('#nav a'),function(a){var k=a.getAttribute('data-r');a.className=(k===route||(route==='agent'&&k==='agents'))?'on':'';});
  var q=null;
  if(!keep&&route==='agents'){q={f:r.qs.f,p:r.qs.p};}
  var html;
  if(route==='agents')html=vAgents(q);
  else if(route==='agent')html=vAgent(parseInt(r.parts[1],10));
  else if(route==='todo')html=vTodo();
  else if(route==='daily')html=vDaily();
  else if(route==='goals')html=vGoals();
  else if(route==='events')html=vEvents();
  else if(route==='data')html=vData();
  else html=vOverview();
  app.innerHTML=backupNotice()+html;
  if(route==='agents')bindAgents();
  if(route==='agent')bindAgent();
  if(route==='data')bindData();
  if(route==='daily'){bindDaily();bindGeneric();}
  if(route==='goals'){bindGoals();bindGeneric();}
  if(route==='events'){bindEvents();bindGeneric();}
  bindCommon();
  updateBattery();
  window.scrollTo(0,keep?sy:0);
}
window.addEventListener('hashchange',function(){render(false);});
initBattery();
initGame();
render(false);
handleSyncParams();
})();
