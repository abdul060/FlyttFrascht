(()=>{'use strict';
const $=id=>document.getElementById(id),cfg=window.FLYTT_CONFIG||{},base=(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabaseAnonKey||'';
let portalRows=[],items=[],filter='oppna',search='',busy=false;
const statuses=['Ny','Behandlas','Godkänd','Avslagen','Klart'];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;}
function fmt(s){if(!s)return '–';const t=new Date(s);return Number.isNaN(t.getTime())?String(s):t.toLocaleString('sv-SE',{dateStyle:'medium',timeStyle:'short'});}
function day(s){if(!s)return 'Ej angivet';const v=String(s);const t=new Date(v+'T12:00:00');return Number.isNaN(t.getTime())?v:t.toLocaleDateString('sv-SE',{dateStyle:'long'});}
function token(){try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null')||{};}catch{return {};}}
async function getAuth(){let s=token();if(!s.token)throw Error('Logga in i adminpanelen först.');return s;}
async function api(path,method='GET',body,refresh=true){let s=await getAuth();let r=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+s.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(r.status===401&&refresh&&s.refreshToken){const renewed=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refreshToken})});if(renewed.ok){const t=await renewed.json();sessionStorage.setItem('flytt_admin_session',JSON.stringify({token:t.access_token,refreshToken:t.refresh_token}));return api(path,method,body,false);}}if(!r.ok){const data=await r.json().catch(()=>({}));throw Error(data.message||data.hint||'Databasfel '+r.status);}if(r.status===204)return null;const text=await r.text();return text?JSON.parse(text):null;}
function setNote(t,error=false){const n=$('inboxNotice');if(n){n.textContent=t;n.classList.toggle('is-error',error);}}
function isOpen(s){return s==='Ny'||s==='Behandlas';}
function portalOf(c){return portalRows.find(p=>String(p.id)===String(c.portal_id));}
function requestName(p){return p?.kundnamn||'Okänd kund';}
function match(c){const p=portalOf(c);const hay=[c.typ,c.meddelande,c.status,c.id,c.portal_id,c.onskat_datum,p?.kundnamn,p?.epost,p?.tjanst,p?.forfragan_id,p?.bokning_id,p?.offert_id].map(v=>String(v||'').toLocaleLowerCase('sv-SE')).join(' ');return (!search||hay.includes(search))&&(filter==='alla'||(filter==='oppna'?isOpen(c.status):c.status===filter));}
function row(label,value){const wrap=el('div','inbox-detail-row');wrap.append(el('span','',label),el('strong','',value||'–'));return wrap;}
function infoPortal(p,c){const w=el('div','inbox-detail-grid');w.append(row('Uppdrag',p?.tjanst||'Ej angiven tjänst'),row('Ärende / förfrågan',p?.forfragan_id||'Ingen förfrågan kopplad'),row('Bokning',p?.bokning_id||'Ingen bokning kopplad'),row('Nuvarande datum',p?.bokningsdatum?day(p.bokningsdatum):'Ej bokad'),row('Nuvarande tid',[p?.bokning_start,p?.bokning_slut].filter(Boolean).map(v=>String(v).slice(0,5)).join('–')||'Ej angiven'),row('Önskat datum',c.onskat_datum?day(c.onskat_datum):'Se meddelande'));return w;}
function labelStatus(s){return s==='Ny'?'Nytt':s;}
async function update(c,status,answer,button){if(busy)return;busy=true;button.disabled=true;setNote('Sparar ändringen…');try{await api('ff_portal_andringar?id=eq.'+encodeURIComponent(c.id),'PATCH',{status,admin_svar:answer.trim()});c.status=status;c.admin_svar=answer.trim();setNote('Sparat: '+requestName(portalOf(c))+' · '+status+'. Kunden kan se status och svar i sin portal. Bokningen ändras inte automatiskt.');render();const select=$('existing');if(select&&String(select.value)===String(c.portal_id))select.dispatchEvent(new Event('change'));}catch(e){setNote('Kunde inte spara: '+e.message,true);}finally{busy=false;button.disabled=false;}}
function decide(c,status,answer,button){
if(busy||document.getElementById('inboxDecisionModal'))return;
const p=portalOf(c),priorFocus=document.activeElement;
const backdrop=el('div','inbox-modal-backdrop');backdrop.id='inboxDecisionModal';
const modal=el('section','inbox-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','inboxModalHeading');modal.setAttribute('aria-describedby','inboxModalDescription');
const eyebrow=el('div','inbox-modal-eyebrow','FLYTT & FRÄSCHT · ÄRENDEHANTERING');
const title=el('h2','',status==='Godkänd'?'Godkänn ändringsönskemål?':status==='Avslagen'?'Avslå ändringsönskemål?':status==='Behandlas'?'Markera som under behandling?':'Markera ärendet som klart?');title.id='inboxModalHeading';
const description=el('p','inbox-modal-description','Du håller på att ändra status för ett kundärende. Kontrollera uppgifterna och bekräfta ditt beslut.');description.id='inboxModalDescription';
const details=el('div','inbox-modal-details');details.append(row('Kund',requestName(p)),row('Uppdrag',p?.tjanst||'Ej angivet'),row('Inkom',fmt(c.skapad)),row('Önskad ändring',c.onskat_datum?day(c.onskat_datum):'Se kundens meddelande'));
const message=el('div','inbox-modal-message',c.meddelande||'(Inget meddelande)');
const replyLabel=el('label','inbox-modal-label','Svar till kunden (valfritt)');replyLabel.htmlFor='inboxModalReply';
const reply=el('textarea','inbox-modal-reply');reply.id='inboxModalReply';reply.value=answer;reply.maxLength=1500;reply.rows=3;reply.placeholder='Skriv en förklaring eller ett svar som kunden kan läsa…';
const warning=el('div','inbox-modal-warning',status==='Godkänd'?'Observera: godkännandet uppdaterar bara statusen i kundportalen. Du måste kontrollera och ändra den riktiga kalenderbokningen separat.':status==='Avslagen'?'Kunden kommer att se att önskemålet avslagits. Skriv gärna varför i svaret ovan.':'Kunden kommer att se den nya statusen i sin portal. Inget mejl skickas automatiskt.');
const controls=el('div','inbox-modal-controls'),cancel=el('button','inbox-modal-cancel','Avbryt'),confirm=el('button','inbox-modal-confirm '+(status==='Avslagen'?'inbox-modal-deny':''),status==='Godkänd'?'Ja, godkänn':status==='Avslagen'?'Ja, avslå':'Bekräfta status');cancel.type='button';confirm.type='button';
let submitting=false;
function close(){if(submitting)return;document.removeEventListener('keydown',onKey);backdrop.remove();if(priorFocus?.isConnected)priorFocus.focus();}
function onKey(e){if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focusable=[reply,cancel,confirm];const current=focusable.indexOf(document.activeElement);if(e.shiftKey&&current===0){e.preventDefault();confirm.focus();}else if(!e.shiftKey&&current===2){e.preventDefault();reply.focus();}}}
cancel.addEventListener('click',close);backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
confirm.addEventListener('click',async()=>{if(submitting)return;submitting=true;confirm.disabled=true;cancel.disabled=true;confirm.textContent='Sparar…';const response=reply.value;try{await update(c,status,response,button);if(c.status===status){document.removeEventListener('keydown',onKey);backdrop.remove();}}finally{if(backdrop.isConnected){submitting=false;confirm.disabled=false;cancel.disabled=false;confirm.textContent=status==='Godkänd'?'Ja, godkänn':status==='Avslagen'?'Ja, avslå':'Bekräfta status';}}});
controls.append(cancel,confirm);modal.append(eyebrow,title,description,details,message,replyLabel,reply,warning,controls);backdrop.append(modal);document.body.append(backdrop);document.addEventListener('keydown',onKey);reply.focus();
}
function makeCard(c){const p=portalOf(c),card=el('article','inbox-item');card.id='ffRequest-'+String(c.id);const top=el('div','inbox-item-top'),heading=el('div','inbox-heading');heading.append(el('div','inbox-person',requestName(p)),el('div','inbox-sub',[(p?.tjanst||'Uppdrag utan tjänst'),p?.epost].filter(Boolean).join(' · ')));const badge=el('span','inbox-status inbox-status-'+(c.status==='Ny'?'new':c.status==='Behandlas'?'progress':c.status==='Godkänd'?'approved':c.status==='Avslagen'?'denied':'done'),labelStatus(c.status));top.append(heading,badge);card.append(top);
const meta=el('div','inbox-meta');meta.append(el('span','', 'Inkom '+fmt(c.skapad)),el('span','', 'Typ: '+(c.typ||'Övrigt')));card.append(meta);
card.append(el('div','inbox-message',c.meddelande||'(Inget meddelande)'));
card.append(infoPortal(p,c));if((c.typ||'').toLocaleLowerCase('sv-SE').includes('datum'))card.append(el('p','ff-inbox-next','Viktigt: kontrollera ledig tid i kalendern innan du godkänner. Beslut här ändrar inte den faktiska bokningen.'));
const actions=el('div','inbox-actions');const ans=el('textarea','inbox-answer');ans.placeholder='Skriv ett svar som kunden ser i Mina uppdrag…';ans.rows=2;ans.maxLength=1500;ans.value=c.admin_svar||'';ans.setAttribute('aria-label','Svar till '+requestName(p));card.append(ans);
function addAction(name,status,cls){const b=el('button',cls,name);b.type='button';b.addEventListener('click',()=>decide(c,status,ans.value,b));actions.append(b);}
if(c.status!=='Godkänd')addAction('✓ Godkänn','Godkänd','inbox-accept');if(c.status!=='Avslagen')addAction('✕ Avslå','Avslagen','inbox-reject');if(c.status!=='Behandlas')addAction('Under behandling','Behandlas','inbox-neutral');if(c.status!=='Klart')addAction('Markera klart','Klart','inbox-neutral');
const goto=el('button','inbox-link','Visa kundens uppdrag');goto.type='button';goto.addEventListener('click',()=>{const s=$('existing');if(!s||!p){setNote('Kundportalen finns inte längre i listan.',true);return;}const expanded=$('ffAdvanced');if(expanded)expanded.open=true;s.value=p.id;s.dispatchEvent(new Event('change'));$('hittaKund')?.scrollIntoView({behavior:'smooth',block:'start'});});actions.append(goto);card.append(actions);return card;}
function renderPriority(){
 const box=$('ffPriorityList'),badge=$('ffPriorityBadge');if(!box||!badge)return;
 const pending=items.filter(c=>isOpen(c.status)).sort((a,b)=>new Date(b.skapad||0)-new Date(a.skapad||0));
 badge.textContent=pending.length?pending.length+' att hantera':'✓ Inget väntar';badge.classList.toggle('is-clear',!pending.length);
 box.replaceChildren();
 if(!pending.length){const clear=el('div','ff-priority-clear');clear.append(el('strong','','✓ Inga öppna ändringsönskemål'),el('p','','När en kund skickar en ändring via Mina sidor dyker den upp här.'));box.append(clear);return;}
 for(const c of pending.slice(0,5)){
  const p=portalOf(c)||{},tile=el('article','ff-priority-card');
  const t=el('div','ff-priority-top');t.append(el('strong','',p.kundnamn||'Kundnamn saknas'),el('span','ff-priority-state',c.status==='Ny'?'NYTT ÖNSKEMÅL':'UNDER BEHANDLING'));tile.append(t);
  tile.append(el('p','ff-priority-type',(c.typ||'Ändring')+' · '+(p.tjanst||'Uppdrag')));
  const dates=el('div','ff-priority-dates');dates.append(el('div','','Nuvarande: '+(p.bokningsdatum?day(p.bokningsdatum):'Inte bokad')),el('div','','Kunden önskar: '+(c.onskat_datum?day(c.onskat_datum):'Se kundens meddelande')));tile.append(dates);
  if(c.meddelande)tile.append(el('p','ff-priority-message',String(c.meddelande).slice(0,260)));
  const button=el('button','ff-priority-open','Öppna och svara →');button.type='button';button.addEventListener('click',()=>{
   filter='oppna';search='';const searchInput=$('inboxSearch');if(searchInput)searchInput.value='';render();
   const target=$('ffRequest-'+String(c.id));if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('ff-request-highlight');window.setTimeout(()=>target.classList.remove('ff-request-highlight'),1800);const a=target.querySelector('.inbox-answer');if(a)a.focus({preventScroll:true});}
  });tile.append(button);box.append(tile);
 }
 if(pending.length>5)box.append(el('p','ff-priority-more','Ytterligare '+(pending.length-5)+' öppna önskemål finns i inkorgen nedan.'));
}
function render(){renderPriority();const root=$('inboxList');if(!root)return;root.replaceChildren();const opened=items.filter(c=>isOpen(c.status)).length;const fresh=items.filter(c=>c.status==='Ny').length;const count=$('inboxOpenCount');if(count)count.textContent=opened;const newCount=$('inboxNewCount');if(newCount)newCount.textContent=fresh;const total=$('inboxTotalCount');if(total)total.textContent=items.length;
for(const b of document.querySelectorAll('[data-inbox-filter]')){const active=b.dataset.inboxFilter===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
const selected=items.filter(match);$('inboxShown').textContent=selected.length+' av '+items.length+' önskemål';if(!selected.length){root.append(el('div','inbox-empty',items.length?'Inga önskemål matchar ditt filter.':'Det finns inga inkomna ändringsönskemål ännu.'));return;}for(const c of selected)root.append(makeCard(c));}
async function reload(){if(!base||!key)return;setNote('Hämtar ändringsönskemål…');try{const [p,c]=await Promise.all([api('ff_kundportaler?select=*&order=skapad.desc&limit=1000'),api('ff_portal_andringar?select=*&order=skapad.desc&limit=1000')]);portalRows=p||[];items=c||[];render();setNote('Senast uppdaterad '+new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})+'. Godkända önskemål ändrar inte den riktiga bokningen.');}catch(e){setNote('Kunde inte läsa inkorgen: '+e.message,true);}}
function init(){if(!$('inboxList'))return;for(const b of document.querySelectorAll('[data-inbox-filter]'))b.addEventListener('click',()=>{filter=b.dataset.inboxFilter;render();});$('inboxSearch').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('sv-SE');render();});$('inboxReload').addEventListener('click',reload);reload();
 // Ny aktivitet visas utan att admin måste ladda om sidan. Skrivna svar avbryts aldrig.
 let lastCheck=Date.now();
 const refreshIfIdle=()=>{if(document.hidden||busy||document.getElementById('inboxDecisionModal'))return;
   const active=document.activeElement;if(active&&['TEXTAREA','INPUT','SELECT'].includes(active.tagName))return;
   if(Date.now()-lastCheck<75000)return;lastCheck=Date.now();reload();};
 window.setInterval(refreshIfIdle,30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshIfIdle();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
