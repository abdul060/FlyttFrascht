/* Flytt & Fräscht – kundhändelser för administratörer.
 * Visar verkliga kundärenden, inte påhittad aktivitet. Data hämtas först
 * efter autentisering och kontroll av Supabase-rollen ff_is_portal_admin.
 * Tidslinjen sorteras efter skapad-tid (ingen obekräftad ändringshistorik).
 */
(()=>{'use strict';
const cfg=window.FLYTT_CONFIG||{},base=String(cfg.supabaseUrl||'').replace(/\/$/,''),anon=String(cfg.supabaseAnonKey||'');
const $=id=>document.getElementById(id);
const isHub=!!$('ffOpsHub'),isMain=!!$('ffAdminOpsPreview');if(!isHub&&!isMain)return;
let raw=[],portals=[],lastRefresh=0,filter='pending',search='',loading=false,started=false;
function session(){try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null')||{};}catch{return {};}}
async function api(path,method='GET',body,tryRefresh=true){
 const s=session();if(!s.token)throw Error('Logga in som administratör för att visa händelser.');
 const r=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:anon,Authorization:'Bearer '+s.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(r.status===401&&tryRefresh&&s.refreshToken){
  const rr=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refreshToken})});
  if(rr.ok){const j=await rr.json();sessionStorage.setItem('flytt_admin_session',JSON.stringify({token:j.access_token,refreshToken:j.refresh_token}));return api(path,method,body,false);}
 }
 if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.message||j.hint||'Databasen svarade med '+r.status);}
 const t=await r.text();return t?JSON.parse(t):null;
}
function fmt(t){if(!t)return 'Tid ej angiven';const d=new Date(t);return Number.isFinite(d.getTime())?d.toLocaleString('sv-SE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Tid ej angiven';}
function day(t){if(!t)return '';const d=new Date(String(t).slice(0,10)+'T12:00:00');return Number.isFinite(d.getTime())?d.toLocaleDateString('sv-SE',{dateStyle:'medium'}):String(t);}
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;}
function findPortal(id){return portals.find(x=>String(x.id)===String(id));}
function changeItem(x){const p=findPortal(x.portal_id)||{};
 const bdate=p.bokningsdatum?day(p.bokningsdatum):'Ingen bekräftad tid angiven';
 const desired=x.onskat_datum?day(x.onskat_datum):'';
 return {kind:'change',portalId:x.portal_id,id:x.id,when:x.skapad||'',customer:p.kundnamn||'Kund (namn saknas)',email:p.epost||'',service:p.tjanst||'Uppdrag',title:x.typ||'Ändringsönskemål',desc:x.meddelande||'',state:x.status||'Ny',answer:x.admin_svar||'',note:desired?'Bokning: '+bdate+'  →  önskat: '+desired:'Nuvarande bokning: '+bdate,search:[p.kundnamn,p.epost,p.tjanst,x.typ,x.meddelande,x.status,p.bokningsdatum,x.onskat_datum].join(' ').toLocaleLowerCase('sv-SE')};}
function eventItem(x){const p=findPortal(x.portal_id)||{};return {kind:'event',portalId:x.portal_id,id:x.id,when:x.skapad||'',customer:p.kundnamn||'Kund (namn saknas)',email:p.epost||'',service:p.tjanst||'Uppdrag',title:x.rubrik||'Meddelande',desc:x.meddelande||'',state:'Publicerad',search:[p.kundnamn,p.epost,p.tjanst,x.rubrik,x.meddelande].join(' ').toLocaleLowerCase('sv-SE')};}
function isPending(x){return x.kind==='change'&&(x.state==='Ny'||x.state==='Behandlas');}
function chooseItems(){let a=raw.filter(x=>filter==='all'||filter==='pending'&&isPending(x)||filter==='changes'&&x.kind==='change'||filter==='messages'&&x.kind==='event');if(search)a=a.filter(x=>x.search.includes(search));return a.slice(0,70);}
function short(x,max=130){const s=String(x||'').trim();return s.length>max?s.slice(0,max-1).trimEnd()+'…':s;}
function jump(id){if(!id)return;if(isHub){const select=$('existing');const selected=select&&[...select.options].some(o=>o.value===String(id));if(selected){const expanded=$('ffAdvanced');if(expanded)expanded.open=true;select.value=String(id);select.dispatchEvent(new Event('change'));$('hittaKund')?.scrollIntoView({behavior:'smooth',block:'start'});}else{$('ffOpsStatus').textContent='Uppdraget finns inte i den aktuella listan. Uppdatera kundportalerna.';}}else{location.href='admin-kundportal.html?portal='+encodeURIComponent(id)+'#hittaKund';}}
function stats(){const allChanges=raw.filter(x=>x.kind==='change');const pending=allChanges.filter(isPending);const today=new Date();const todayStr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');const recent=raw.filter(x=>x.when&&new Date(x.when).getTime()>=Date.now()-7*864e5);return [
 {label:'Nya önskemål',value:pending.filter(x=>x.state==='Ny').length,detail:'Väntar på första svar',tone:'orange'},
 {label:'Att hantera',value:pending.length,detail:'Nya + under behandling',tone:'orange'},
 {label:'Besvarade önskemål',value:allChanges.filter(x=>['Godkänd','Avslagen','Klart'].includes(x.state)).length,detail:'Ärenden som fått beslut',tone:'teal'},
 {label:'Händelser senaste 7 dagarna',value:recent.length,detail:'Ändringsönskemål och meddelanden',tone:'blue'}
 ];}
function renderStats(){const k=$('ffOpsKpis')||$('ffAdminOpsKpis');if(!k)return;k.replaceChildren();for(const s of stats()){const box=el('div','ff-ops-metric '+s.tone);box.append(el('span','',s.label),el('strong','',s.value),el('small','',s.detail));k.append(box);}}
function drawItem(x){const card=el('article','ff-ops-item '+(isPending(x)?'needs-attention':''));const line=el('div','ff-ops-row'),who=el('div','ff-ops-who');who.append(el('strong','',x.customer),el('small','',x.service+(x.email?' · '+x.email:'')));const badge=el('span','ff-ops-badge '+(isPending(x)?'pending':x.kind==='event'?'note':'done'),x.state);line.append(who,badge);card.append(line);
 card.append(el('h4','',x.kind==='event'?'Meddelande: '+x.title:'Önskemål: '+x.title));
 if(x.desc)card.append(el('p','ff-ops-description',short(x.desc,isHub?250:105)));
 if(x.note)card.append(el('p','ff-ops-change-date',x.note));
 const foot=el('div','ff-ops-foot');foot.append(el('time','', 'Inkom '+fmt(x.when)));const button=el('button','ff-ops-open','Visa kundärende ↗');button.type='button';button.addEventListener('click',()=>jump(x.portalId));foot.append(button);card.append(foot);
 if(x.answer&&isHub)card.append(el('p','ff-ops-admin-answer','Svar: '+short(x.answer,250)));
 return card;}
function draw(){renderStats();const feed=$('ffOpsFeed')||$('ffAdminOpsRecent');if(!feed)return;feed.replaceChildren();const items=chooseItems();if(isMain){for(const x of raw.filter(isPending).slice(0,4))feed.append(drawItem(x));if(!raw.filter(isPending).length)feed.append(el('p','ff-ops-empty','Inga öppna ändringsönskemål. Ni är ikapp med kundernas förfrågningar.'));return;}
 document.querySelectorAll('[data-ff-ops-filter]').forEach(b=>{const active=b.dataset.ffOpsFilter===filter;b.setAttribute('aria-pressed',String(active));b.classList.toggle('selected',active);});
 if(!items.length)feed.append(el('p','ff-ops-empty',raw.length?'Inga händelser matchar filtret.':'Inga ändringsönskemål eller meddelanden ännu.'));
 for(const x of items)feed.append(drawItem(x));}
async function load(){if(loading||!base.startsWith('https://')||!anon)return;loading=true;const status=$('ffOpsStatus');if(status)status.textContent='Hämtar kundhändelser från Supabase…';try{
 const allowed=await api('rpc/ff_is_portal_admin','POST',{});
 if(allowed!==true)throw Error('Kontot saknar behörighet att se kundärenden.');
 const [p,changes,events]=await Promise.all([
 api('ff_kundportaler?select=id,kundnamn,epost,tjanst,bokningsdatum,bokningsstatus&order=skapad.desc&limit=600'),
 api('ff_portal_andringar?select=id,portal_id,typ,meddelande,status,admin_svar,onskat_datum,skapad&order=skapad.desc&limit=700'),
 api('ff_portal_handelser?select=id,portal_id,rubrik,meddelande,skapad&order=skapad.desc&limit=350')]);
 portals=p||[];raw=[...(changes||[]).map(changeItem),...(events||[]).map(eventItem)].sort((a,b)=>new Date(b.when||0)-new Date(a.when||0));lastRefresh=Date.now();draw();if(status)status.textContent='Senast hämtat '+new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})+'. Visar skapade ärenden och publicerade meddelanden.';if($('ffOpsUpdated'))$('ffOpsUpdated').textContent='Uppdaterad '+new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});
 }catch(err){const message='Kunde inte läsa kundhändelser: '+err.message;if(status)status.textContent=message;const feed=$('ffOpsFeed')||$('ffAdminOpsRecent');if(feed)feed.replaceChildren(el('p','ff-ops-empty',message));}
 finally{loading=false;}}
function setup(){if(started)return;started=true;$('ffOpsRefresh')?.addEventListener('click',load);$('ffOpsSearch')?.addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('sv-SE');draw();});document.querySelectorAll('[data-ff-ops-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.ffOpsFilter;draw();}));const gate=$('adminApp')||$('dashboard');if(!gate)return;
 const check=()=>{if(!gate.hidden&&(!lastRefresh||Date.now()-lastRefresh>30000))load();};
 new MutationObserver(check).observe(gate,{attributes:true,attributeFilter:['hidden']});if(!gate.hidden)check();
 // Förfrågningarna ändras även från andra flikar. Vi läser om när operatören återvänder.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!gate.hidden&&Date.now()-lastRefresh>60000)load();});
 window.addEventListener('focus',()=>{if(!gate.hidden&&Date.now()-lastRefresh>60000)load();});
 window.setInterval(()=>{if(!gate.hidden&&!document.hidden&&Date.now()-lastRefresh>60000)load();},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
