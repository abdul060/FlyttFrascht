// Separat läsgalleri för Flytt & Fräscht admin. Inga ändringar i admin.js.
(function(){'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CFG=window.FLYTT_CONFIG||{};
const endpoint=String(CFG.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/admin-jobbfoton';
let photos=[],selected='alla',search='',pendingDelete=null,deleting=false;
const dashboard=$('#dashboard'),nav=$('.tabs');
if(!dashboard||!nav)return;
const tab=document.createElement('button');tab.type='button';tab.dataset.photoTab='true';tab.textContent='📸 Jobbfoton';nav.append(tab);
const pane=document.createElement('section');pane.className='tab-content ff-admin-photos';pane.id='ffAdminPhotos';pane.hidden=true;
pane.innerHTML='<div class="ff-ap-header"><div><span class="ff-ap-eyebrow">TIMERFLYTT · SKYDDAT GALLERI</span><h2>📸 Jobbfoton</h2><p>Före- och efterbilder från personalens arbetspass. Endast inloggade administratörer kan öppna dem här.</p></div><button type="button" class="ff-ap-refresh" id="ffApRefresh">↻ Uppdatera bilder</button></div><div class="ff-ap-controls"><label for="ffApSearch">Sök datum, tjänst eller medarbetare<input id="ffApSearch" type="search" placeholder="Sök bland jobbfoton…"></label><div class="ff-ap-filter" role="group" aria-label="Bildtyp"><button type="button" data-photo-filter="alla" class="selected">Alla</button><button type="button" data-photo-filter="fore">Före</button><button type="button" data-photo-filter="efter">Efter</button></div></div><p id="ffApStatus" role="status" aria-live="polite"></p><div id="ffApGrid" class="ff-ap-grid"></div><p class="ff-ap-note">🔐 Privata, tidsbegränsade bildlänkar. Bilderna är bara till för dokumentation och ska hanteras enligt era integritetsrutiner.</p>';
dashboard.append(pane);
function session(){try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null')}catch{return null}}
function hide(){pane.hidden=true;tab.classList.remove('active');}
function open(){
 if(dashboard.hidden)return;
 document.querySelectorAll('.tab-content').forEach(el=>{if(el!==pane)el.hidden=true});
 document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.classList.remove('active'));
 pane.hidden=false;tab.classList.add('active');load();
}
function draw(){
 const grid=$('#ffApGrid');if(!grid)return;
 const items=photos.filter(p=>(selected==='alla'||p.stage===selected)&&[p.job_date,p.service,p.uploaded_by_name].some(v=>String(v||'').toLocaleLowerCase('sv').includes(search)));
 $('#ffApStatus').textContent=items.length+' av '+photos.length+' bilder visas';
 grid.innerHTML=items.length?items.map(p=>'<article class="ff-ap-item"><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer" aria-label="Öppna jobbfoto från '+esc(p.job_date)+'"><img loading="lazy" src="'+esc(p.url)+'" alt="'+(p.stage==='fore'?'Bild före arbetet':'Bild efter arbetet')+'"></a><div class="ff-ap-info"><span class="ff-ap-stage '+(p.stage==='efter'?'after':'')+'">'+(p.stage==='fore'?'Före':'Efter')+'</span><strong>'+esc(p.service||'Uppdrag')+'</strong><span>'+esc(p.job_date||'')+'</span><small>Uppladdat av '+esc(p.uploaded_by_name||'personal')+'</small><button type="button" class="ff-ap-delete" data-photo-delete="'+esc(p.id)+'" aria-label="Radera bilden från '+esc(p.job_date||'uppdraget')+'">🗑 Radera bild</button></div></article>').join(''):'<div class="ff-ap-empty">📷 <strong>Inga bilder matchar ditt val.</strong><span>Testa att byta filter eller uppdatera.</span></div>';
}
async function load(){
 const status=$('#ffApStatus'),button=$('#ffApRefresh');
 const current=session();if(!current?.token){status.textContent='Logga in som administratör för att se bilder.';$('#ffApGrid').replaceChildren();return}
 status.textContent='Hämtar skyddade jobbfoton…';button.disabled=true;
 try{
  const r=await fetch(endpoint,{headers:{Authorization:'Bearer '+current.token,apikey:CFG.supabaseAnonKey||''},cache:'no-store'});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Kunde inte läsa bilderna (HTTP '+r.status+').');
  photos=Array.isArray(d.photos)?d.photos:[];draw();
 }catch(e){photos=[];$('#ffApGrid').replaceChildren();status.textContent=e.message||'Fel vid hämtning.';}
 finally{button.disabled=false;}
}
tab.addEventListener('click',open);
// admin.js hanterar originalflikarna, vi döljer bara vår fristående panel.
nav.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',hide));
$('#ffApRefresh').addEventListener('click',load);
$('#ffApSearch').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('sv');draw()});
pane.querySelectorAll('[data-photo-filter]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.photoFilter;pane.querySelectorAll('[data-photo-filter]').forEach(x=>x.classList.toggle('selected',x===b));draw()}));
// Deletion dialog lives in its own layer so no browser confirm() is needed.
const modal=document.createElement('div');modal.className='ff-ap-delete-dialog';modal.hidden=true;
modal.innerHTML='<div class="ff-ap-delete-card" role="dialog" aria-modal="true" aria-labelledby="ffApDeleteTitle" aria-describedby="ffApDeleteDesc"><h3 id="ffApDeleteTitle">🗑 Radera den här bilden?</h3><p id="ffApDeleteDesc"></p><p class="ff-ap-warning">Bilden tas bort permanent från Supabase Storage och bildlistan. Detta går inte att ångra.</p><div class="ff-ap-delete-actions"><button type="button" class="ff-ap-delete-cancel">Avbryt</button><button type="button" class="ff-ap-delete-confirm">Ja, radera</button></div></div>';
document.body.append(modal);
const cancel=modal.querySelector('.ff-ap-delete-cancel'),confirm=modal.querySelector('.ff-ap-delete-confirm');
let previousFocus=null;
function closeDelete(){if(deleting)return;modal.hidden=true;pendingDelete=null;previousFocus?.focus?.();}
$('#ffApGrid').addEventListener('click',e=>{
 const btn=e.target.closest('[data-photo-delete]');if(!btn||deleting)return;
 const p=photos.find(v=>v.id===btn.dataset.photoDelete);if(!p)return;
 pendingDelete=p;previousFocus=btn;
 modal.querySelector('#ffApDeleteDesc').textContent=(p.stage==='fore'?'Före':'Efter')+' · '+(p.service||'Uppdrag')+' · '+(p.job_date||'')+'. Vill du verkligen ta bort fotot?';
 modal.hidden=false;cancel.focus();
});
cancel.addEventListener('click',closeDelete);
modal.addEventListener('click',e=>{if(e.target===modal)closeDelete()});
modal.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();closeDelete();}
 if(e.key==='Tab'){
  const first=cancel,last=confirm;
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
});
confirm.addEventListener('click',async()=>{
 if(deleting||!pendingDelete)return;
 const id=pendingDelete.id,current=session();
 if(!current?.token){closeDelete();$('#ffApStatus').textContent='Din inloggning har gått ut. Logga in igen.';return;}
 deleting=true;confirm.disabled=true;cancel.disabled=true;confirm.textContent='Raderar…';
 try{
   const r=await fetch(endpoint,{method:'DELETE',headers:{Authorization:'Bearer '+current.token,apikey:CFG.supabaseAnonKey||'','Content-Type':'application/json'},body:JSON.stringify({id}),cache:'no-store'});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Kunde inte radera bilden (HTTP '+r.status+').');
   photos=photos.filter(p=>p.id!==id);draw();$('#ffApStatus').textContent='✅ Bilden har raderats från Supabase.';
   modal.hidden=true;pendingDelete=null;
 }catch(e){$('#ffApStatus').textContent='⚠️ '+(e.message||'Kunde inte radera bilden.');modal.querySelector('#ffApDeleteDesc').textContent=e.message||'Försök igen.';}
 finally{deleting=false;confirm.disabled=false;cancel.disabled=false;confirm.textContent='Ja, radera';if(modal.hidden)$('#ffApRefresh').focus();}
});
$('#logoutBtn')?.addEventListener('click',()=>{hide();photos=[];$('#ffApGrid').replaceChildren();modal.hidden=true;pendingDelete=null});
})();
