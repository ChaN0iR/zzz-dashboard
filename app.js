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
function fresh(){
  var d=clone(window.ZZZ_INITIAL);
  d.agents.forEach(function(a){a.priority='養成中';a.note='';});
  return d;
}
var S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(v){var n=parseFloat(String(v==null?'':v).replace(/[^\d.\-]/g,''));return isNaN(n)?0:n;}
function lvn(s){return num(s);}
function fin(a,k){var v=a.final_stats&&a.final_stats[k];return v&&v.length?v[v.length-1]:'';}

function engineOK(a){return a.w_engine&&a.w_engine.name&&lvn(a.w_engine.level)>=60;}
function discs(a){return a.drive_discs||[];}
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
  return{score:sc,gaps:gaps,flag:flag,c15:c15,c0:c0,skAvg:sk/SK.length,cr:cr,cd:cd};
}
function bar(p){var c=p<50?'low':p<75?'mid':'hi';return '<div class="bar '+c+'"><i style="width:'+p+'%"></i></div>';}

function agentById(i){return S.agents.filter(function(a){return a.index===i;})[0];}

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
  h+='<p class="small">建置分數：音擎 30、驅動盤 Lv15 數量 40、技能 15、暴擊 15（滿分 100）。純異常或支援角色的暴擊項會偏低，僅供參考。</p>';
  return h;
}

var sortK='score',sortD=1,filt={q:'',f:'',p:''};
function vAgents(q){
  if(q){filt.f=q.f||'';filt.p=q.p||'';}
  var rows=S.agents.map(function(a){var e=evalAgent(a);return{a:a,e:e,
    v:{index:a.index,name:a.name,mind:num(a.mindscape_lit),pri:PRI.indexOf(a.priority),score:e.score,
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
  var cols=[['name','名稱'],['pri','優先度'],['mind','影畫'],['score','建置分'],['eng','音擎'],['c15','Lv15 盤'],['sk','技能均'],['cr','暴擊率'],['cd','暴擊傷害'],['atk','攻擊力'],['flag','狀態']];
  var h='<h1>代理人 <span class="small">'+rows.length+' / '+S.agents.length+'</span></h1><div class="tools">'+
   '<input id="fq" placeholder="搜尋名稱" value="'+esc(filt.q)+'">'+
   '<select id="ff"><option value="">全部</option>'+[['attn','需要注意'],['noeng','未裝備音擎'],['lowEng','音擎未滿 60'],['disc0','有 Lv0 驅動盤']].map(function(o){return '<option value="'+o[0]+'"'+(filt.f===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+
   '<select id="fp"><option value="">全部優先度</option>'+PRI.map(function(p){return '<option'+(filt.p===p?' selected':'')+'>'+p+'</option>';}).join('')+'</select></div>'+
   '<div class="tw"><table><thead><tr>'+cols.map(function(c){return '<th data-k="'+c[0]+'">'+c[1]+(sortK===c[0]?(sortD>0?' ▲':' ▼'):'')+'</th>';}).join('')+'</tr></thead><tbody>'+
   rows.map(function(r){var a=r.a,e=r.e;return '<tr><td><a href="#/agent/'+a.index+'">'+esc(a.name)+'</a></td><td>'+esc(a.priority)+'</td><td>'+r.v.mind+'</td><td><div style="display:flex;gap:6px;align-items:center">'+e.score+bar(e.score)+'</div></td><td>'+(r.v.eng<0?'無':'Lv'+r.v.eng)+'</td><td>'+e.c15+' / 6</td><td>'+e.skAvg.toFixed(1)+'</td><td>'+esc(fin(a,'暴擊率'))+'</td><td>'+esc(fin(a,'暴擊傷害'))+'</td><td>'+esc(fin(a,'攻擊力'))+'</td><td>'+(e.flag?'<span class="flag">需注意</span>':'')+'</td></tr>';}).join('')+'</tbody></table></div>';
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
   '<div class="row"><label>建置分數</label><span>'+e.score+'</span></div>'+bar(e.score)+
   '<div class="row"><label>名稱</label>'+inp(P+'.name',a.name)+'</div>'+
   '<div class="row"><label>等級</label>'+inp(P+'.level',a.level)+'</div>'+
   '<div class="row"><label>影畫（亮起數）</label>'+inp(P+'.mindscape_lit',a.mindscape_lit)+'</div>'+
   '<label class="small">備註</label><textarea data-p="'+P+'.note">'+esc(a.note||'')+'</textarea></div>';
  h+='<div class="card"><div class="small">缺口</div>'+(e.gaps.length?'<ul class="gap">'+e.gaps.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul>':'<div style="color:var(--g)">無明顯缺口</div>')+'</div></div>';
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
    l.forEach(function(x){h+='<div class="card" style="margin-bottom:8px"><div class="row"><a href="#/agent/'+x.a.index+'" style="color:inherit"><b>'+esc(x.a.name)+'</b></a><span>'+x.e.score+'</span></div><ul class="gap">'+x.e.gaps.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul></div>';});
  });
  var noM=S.agents.filter(function(a){return a.priority==='主力';}).length;
  if(!noM)h+='<p class="small">尚未指定任何主力。到代理人頁面把優先度改成「主力」，這裡就會優先顯示。</p>';
  return h;
}
function vData(){
  return '<h1>資料</h1><div class="card"><p>資料只存在這個瀏覽器的 localStorage。換裝置或清除瀏覽器資料前，請先匯出備份。</p>'+
   '<div class="tools"><button id="bx">匯出 JSON</button><button id="bi">匯入 JSON</button><button id="br">重設為初始資料</button></div><input type="file" id="fi" accept=".json,application/json" style="display:none"><div id="msg" class="small"></div></div>';
}
function bindData(){
  var m=document.getElementById('msg');
  document.getElementById('bx').onclick=function(){
    var b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});
    var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='zzz-dashboard-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},1000);
  };
  var fi=document.getElementById('fi');
  document.getElementById('bi').onclick=function(){fi.click();};
  fi.onchange=function(){
    var f=fi.files[0];if(!f)return;var r=new FileReader();
    r.onload=function(){try{var o=JSON.parse(r.result);if(!o||!Array.isArray(o.agents))throw new Error('缺少 agents');
      if(!confirm('匯入會覆蓋目前資料，確定嗎？'))return;S=o;save();m.textContent='匯入完成，共 '+o.agents.length+' 位代理人。';}catch(e){m.textContent='匯入失敗：'+e.message;}};
    r.readAsText(f);
  };
  document.getElementById('br').onclick=function(){if(confirm('所有修改都會消失，確定重設為初始資料嗎？')){S=fresh();save();m.textContent='已重設。';}};
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
  else if(route==='data')html=vData();
  else html=vOverview();
  app.innerHTML=html;
  if(route==='agents')bindAgents();
  if(route==='agent')bindAgent();
  if(route==='data')bindData();
  window.scrollTo(0,keep?sy:0);
}
window.addEventListener('hashchange',function(){render(false);});
render(false);
})();
