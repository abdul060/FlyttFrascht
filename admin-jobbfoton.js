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

// Publicering: separata kopior, ingen offentlig åtkomst till privata original.
const galleryStyle=document.createElement('link');galleryStyle.rel='stylesheet';galleryStyle.href='admin-publicering.css';document.head.append(galleryStyle);
const pubEndpoint=String(CFG.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/publicera-jobbfoton';
let approved=new Set();
async function refreshApprovals(){
 try{const r=await fetch(pubEndpoint,{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();approved=new Set((d.photos||[]).map(p=>p.id));}catch{approved=new Set();}
 updatePublishLabels();
}
function updatePublishLabels(){
 document.querySelectorAll('[data-ff-publish]').forEach(b=>{const yes=approved.has(b.dataset.ffPublish);b.textContent=yes?'↩ Avpublicera':'🌐 Publicera på hemsidan';b.dataset.published=yes?'1':'0';});
}
const publishDialog=document.createElement('dialog');publishDialog.className='ff-gallery-publish-dialog';
publishDialog.innerHTML='<form method="dialog" class="ff-gallery-publish-card"><h3 id="ffPubTitle">Publicera jobbfoto?</h3><p>Det här gör en separat bildkopia synlig för alla besökare på hemsidan. Kontrollera bilden noggrant: inga personer, namnskyltar, dokument, adressuppgifter eller andra känsliga detaljer.</p><label>Bildtext (utan kunduppgifter)<input id="ffPubCaption" maxlength="150" required placeholder="Exempel: Flyttstädning – före arbetet"></label><label>Hur och när godkände kunden publicering?<textarea id="ffPubConsent" rows="3" minlength="10" maxlength="300" required placeholder="Exempel: Skriftligt godkännande via e-post 2026-11-08"></textarea></label><label class="ff-gallery-pub-check"><input id="ffPubAgree" type="checkbox" required> Jag har kundens uttryckliga tillstånd för offentlig publicering av just denna bild och har kontrollerat innehållet.</label><p id="ffPubStatus" role="status"></p><div class="ff-gallery-pub-actions"><button value="cancel" type="button" id="ffPubCancel">Avbryt</button><button value="ok" type="button" id="ffPubConfirm">Godkänn och publicera</button></div></form>';
document.body.append(publishDialog);
let selectedPublish=null, publishing=false;
publishDialog.querySelector('#ffPubCancel').addEventListener('click',()=>{if(!publishing)publishDialog.close()});
function imgWebp(url){return new Promise(async(resolve,reject)=>{try{
 const response=await fetch(url,{mode:'cors',cache:'no-store'});if(!response.ok)throw Error('Kunde inte läsa originalbilden.');
 const blob=await response.blob();const bitmap=await createImageBitmap(blob);
 const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Bildkonvertering stöds inte.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
 canvas.toBlob(async b=>{if(!b)return reject(Error('Bilden kunde inte konverteras.'));
 if(b.size>1500000)return reject(Error('Webbbilden blev för stor.'));
 const bytes=new Uint8Array(await b.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve(btoa(binary));},'image/webp',0.77);
 }catch(e){reject(e)}})}
function addPublishButtons(){
 document.querySelectorAll('#ffApGrid .ff-ap-item').forEach(card=>{
  const del=card.querySelector('[data-photo-delete]');if(!del||card.querySelector('[data-ff-publish]'))return;
  const btn=document.createElement('button');btn.type='button';btn.className='ff-gallery-publish-btn';btn.dataset.ffPublish=del.dataset.photoDelete;
  del.before(btn);
 });updatePublishLabels();
}
const observer=new MutationObserver(()=>{observer.disconnect();addPublishButtons();observer.observe($('#ffApGrid'),{childList:true});});
observer.observe($('#ffApGrid'),{childList:true});
const originalLoad=load;
// Fliken laddar privata bilder först; sedan hämtas bara redan publicerade ID:n.
$('#ffApRefresh').addEventListener('click',()=>setTimeout(refreshApprovals,500));
tab.addEventListener('click',()=>setTimeout(refreshApprovals,500));
$('#ffApGrid').addEventListener('click',async(e)=>{
 const b=e.target.closest('[data-ff-publish]');if(!b||publishing)return;
 const photo=photos.find(p=>p.id===b.dataset.ffPublish);if(!photo)return;
 const token=session()?.token;if(!token)return alert('Logga in igen.');
 if(approved.has(photo.id)){
  if(!window.confirm('Avpublicera bilden från hemsidan? Den privata originalbilden behålls.'))return;
  b.disabled=true;
  try{const r=await fetch(pubEndpoint,{method:'POST',headers:{Authorization:'Bearer '+token,apikey:CFG.supabaseAnonKey||'','Content-Type':'application/json'},body:JSON.stringify({action:'unpublish',id:photo.id})});const d=await r.json();if(!r.ok)throw Error(d.error||'Avpublicering misslyckades.');approved.delete(photo.id);updatePublishLabels();$('#ffApStatus').textContent='✅ Bilden har avpublicerats.';}
  catch(err){$('#ffApStatus').textContent='⚠️ '+err.message;}finally{b.disabled=false;}
  return;
 }
 selectedPublish=photo;
 publishDialog.querySelector('#ffPubTitle').textContent='Publicera '+(photo.stage==='fore'?'förebilden':'efterbilden')+' på hemsidan?';
 publishDialog.querySelector('#ffPubCaption').value=(photo.service||'Utfört arbete')+' – '+(photo.stage==='fore'?'före':'efter');
 publishDialog.querySelector('#ffPubConsent').value='';publishDialog.querySelector('#ffPubAgree').checked=false;
 publishDialog.querySelector('#ffPubStatus').textContent='';publishDialog.showModal();
});
publishDialog.querySelector('#ffPubConfirm').addEventListener('click',async()=>{
 if(publishing||!selectedPublish)return;
 const consent=publishDialog.querySelector('#ffPubConsent');const agree=publishDialog.querySelector('#ffPubAgree');const caption=publishDialog.querySelector('#ffPubCaption');
 if(!caption.reportValidity()||!consent.reportValidity()||!agree.reportValidity())return;
 publishing=true;const btn=publishDialog.querySelector('#ffPubConfirm');btn.disabled=true;
 const status=publishDialog.querySelector('#ffPubStatus');status.textContent='Förbereder webbbilden och publicerar…';
 try{
  const base64=await imgWebp(selectedPublish.url);
  const r=await fetch(pubEndpoint,{method:'POST',headers:{Authorization:'Bearer '+session().token,apikey:CFG.supabaseAnonKey||'','Content-Type':'application/json'},body:JSON.stringify({action:'publish',id:selectedPublish.id,image_base64:base64,caption:caption.value.trim(),consent_reference:consent.value.trim(),consent_confirmed:true})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Publiceringen misslyckades.');
  approved.add(selectedPublish.id);updatePublishLabels();publishDialog.close();$('#ffApStatus').textContent='✅ Bilden är nu publicerad på hemsidan.';
 }catch(err){status.textContent='⚠️ '+(err.message||'Publiceringen misslyckades.');}
 finally{publishing=false;btn.disabled=false;}
});

})();
