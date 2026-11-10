/* Flytt & Fräscht – gratis förbättring av befintligt offertflöde.
   Inga externa API-anrop, ingen ny spårning och inga cookies. */
(function(){
 'use strict';
 const form=document.getElementById('f');
 if(!form)return;
 const $=id=>document.getElementById(id);
 const draftKey='ff_offert_draft_v1';
 const checkbox=$('ff-save-draft'),clear=$('ff-clear-draft'),status=$('ff-draft-status');
 const safeFields=['n','p','e','s','d','a','move-from','move-to','move-floor-from','move-floor-to','move-lift-from','move-lift-to','m','k','g','ff-alt-date','clean-empty','clean-windows','home-frequency','window-count','window-type','window-sides','carry-type','carry-transport','carry-items'];
 const checkFields=['move-pack','move-clean','multi-flytt','multi-flyttstad','multi-hemstad','multi-fonster','multi-bar'];
 const roomFields=['r1','r2','r3','r4','r5'];
 const hiddenOptional=$('ffExtraDetails');
 let enabled=false;
 const read=()=>{try{const v=localStorage.getItem(draftKey);return v?JSON.parse(v):null;}catch(_){return null;}};
 function clearDraft(){try{localStorage.removeItem(draftKey);}catch(_){ } clear.hidden=true;enabled=false;checkbox.checked=false;}
 function saveDraft(){
  if(!enabled)return;
  const fields={};
  for(const id of safeFields){const el=$(id);if(el)fields[id]=el.value;}
  for(const id of checkFields){const el=$(id);if(el)fields[id]=el.checked;}
  fields.room=roomFields.find(id=>$(id)?.checked)||'';
  try{localStorage.setItem(draftKey,JSON.stringify({timestamp:Date.now(),fields}));clear.hidden=false;status.textContent='Utkast sparat på den här enheten. Raderas automatiskt efter 24 timmar.';}catch(_){status.textContent='Webbläsaren kunde inte spara utkastet.';}
 }
 let timer;
 function schedule(){if(!enabled)return;clearTimeout(timer);timer=setTimeout(saveDraft,550);}
 const saved=read();
 if(saved){
  if(!Number.isFinite(saved.timestamp)||Date.now()-saved.timestamp>86400000||saved.timestamp>Date.now()+60000){clearDraft();}
  else{
   // Visa aldrig kontaktuppgifter utan att kunden själv väljer att återställa dem.
   clear.hidden=false;
   const recover=document.createElement('button');
   recover.type='button';recover.className='ff-clear-draft';recover.textContent='Återställ sparad offert';
   checkbox.parentNode.parentNode.insertBefore(recover,checkbox.parentNode);
   recover.addEventListener('click',()=>{
    checkbox.checked=true;enabled=true;
    for(const id of safeFields){const el=$(id);if(!el||saved.fields[id]===undefined)continue;
      // URL-förval från tjänstesidorna vinner över sparat tjänsteval.
      if(id==='s'&&new URLSearchParams(location.search).has('tjanst'))continue;
      el.value=saved.fields[id];el.dispatchEvent(new Event('change',{bubbles:true}));
    }
    for(const id of checkFields){const el=$(id);if(el&&saved.fields[id]!==undefined){el.checked=!!saved.fields[id];el.dispatchEvent(new Event('change',{bubbles:true}));}}
    const r=$(saved.fields.room);if(r){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}
    if(saved.fields['ff-alt-date']||saved.fields.k||saved.fields.g)hiddenOptional.open=true;
    const slider=$('m');if(slider)slider.dispatchEvent(new Event('input',{bubbles:true}));
    status.textContent='Din sparade offert är återställd. Kontrollera uppgifterna innan du skickar.';
    recover.remove();saveDraft();
   });
  }
 }
 checkbox.addEventListener('change',()=>{enabled=checkbox.checked;if(enabled){saveDraft();}else{clearDraft();status.textContent='Inga uppgifter sparas längre på den här enheten.';}});
 clear.addEventListener('click',()=>{clearDraft();status.textContent='Dina sparade uppgifter är raderade från webbläsaren.';});
 form.addEventListener('input',schedule,{passive:true});
 form.addEventListener('change',schedule,{passive:true});
 // Extra datum läggs i det befintliga meddelandefältet före offertgranskningen.
 const extraDate=$('ff-alt-date'), msg=$('g');
 function syncAltDate(){
   if(!extraDate||!msg)return;
   const marker='Alternativt önskat datum: ';
   const clean=msg.value.split('\n').filter(line=>!line.startsWith(marker)).join('\n').trim();
   const next=extraDate.value?(clean?clean+'\n':'')+marker+extraDate.value:clean;
   if(next.length<=1800&&next!==msg.value){msg.value=next;msg.dispatchEvent(new Event('input',{bubbles:true}));}
 }
 // capture så befintlig submit- och granskningkod tar med alternativt datum.
 form.addEventListener('submit',syncAltDate,true);
 extraDate?.addEventListener('change',syncAltDate);
 // Bekräftelsen visas endast efter verifierad framgång i ordinarie formulärkod.
 const success=$('res');
 if(success&&typeof MutationObserver!=='undefined'){
  const observer=new MutationObserver(()=>{if(success.classList.contains('on')){
    clearDraft();status.textContent='Förfrågan skickad. Inget utkast ligger kvar.';
  }});
  observer.observe(success,{attributes:true,attributeFilter:['class']});
 }
 // Galleri-genvägen syns endast när publicerade jobbfoton faktiskt visas.
 const gallery=$('ffPublicGallery'),shortcut=$('ff-gallery-shortcut');
 if(gallery&&shortcut){
  const update=()=>{shortcut.hidden=gallery.hidden||!$('ffPublicGalleryGrid')?.children.length;};
  update();const observer=new MutationObserver(update);
  observer.observe(gallery,{attributes:true,attributeFilter:['hidden']});
  const grid=$('ffPublicGalleryGrid');if(grid)observer.observe(grid,{childList:true});
 }
})();
