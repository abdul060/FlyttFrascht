(()=>{'use strict';
const cfg=window.FLYTT_CONFIG||{},base=(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabaseAnonKey||'';
const $=s=>document.getElementById(s), txt=(id,value)=>{$(id).textContent=value==null||value===''?'–':String(value);};
const state={token:'',refresh:'',expires:0,portals:[],active:null,photoUrls:[],resetting:false,verifyEmail:'',resetEmail:'',hiddenIds:new Set(),hidePanelOpen:false};
const urlParams=new URLSearchParams(location.hash.replace(/^#/,''));
const date=s=>s?new Date(s+'T12:00:00').toLocaleDateString('sv-SE'):'–';
const dateTime=s=>s?new Date(s).toLocaleString('sv-SE',{dateStyle:'medium',timeStyle:'short'}):'–';
const kr=n=>n==null?'Inväntar pris':Number(n).toLocaleString('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:2});
const headers=(auth=false)=>({'apikey':key,...(auth?{'Authorization':'Bearer '+state.token}:{'Authorization':'Bearer '+key})});
function add(parent,tag,str,cls){const e=document.createElement(tag);e.textContent=str==null?'':String(str);if(cls)e.className=cls;parent.append(e);return e;}
function line(id,label,value){const row=add($(id),'div','','kv');add(row,'span',label);add(row,'span',value??'–');}
function setSession(j){if(!j?.access_token||!j?.refresh_token)throw Error('Ogiltig session. Logga in på nytt.');state.token=j.access_token;state.refresh=j.refresh_token;state.expires=Date.now()+((Number(j.expires_in)||3600)*1000);sessionStorage.setItem('ff_customer_password_pilot_session',JSON.stringify({token:state.token,refresh:state.refresh,expires:state.expires}));}
async function renew(){if(!state.refresh)throw Error('Logga in på nytt.');const r=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:state.refresh})});if(!r.ok)throw Error('Sessionen har gått ut. Logga in på nytt.');setSession(await r.json());}
async function request(path,opts={},retry=true){if(state.expires-Date.now()<50000)await renew();const h={...headers(true),...(opts.body!=null?{'Content-Type':'application/json'}:{}),...opts.headers};let r=await fetch(base+path,{...opts,headers:h});if(r.status===401&&retry){await renew();return request(path,opts,false);}if(!r.ok){let msg=(await r.json().catch(()=>({}))).message;throw Error(msg||'Kunde inte läsa eller spara. HTTP '+r.status);}if(r.status===204)return null;const body=await r.text();return body?JSON.parse(body):null;}
async function authPost(endpoint,body){const r=await fetch(base+'/auth/v1/'+endpoint,{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.msg||j.error_description||j.message||j.error||'Autentiseringen misslyckades.');return j;}
async function signIn(){const email=$('email').value.trim().toLowerCase(),password=$('password').value;const btn=$('loginForm').querySelector('button');btn.disabled=true;txt('loginStatus','Loggar in…');try{const j=await authPost('token?grant_type=password',{email,password});setSession(j);$('password').value='';await load();}catch(e){txt('loginStatus',e.message);}finally{btn.disabled=false;}}
function showVerification(email){
 state.verifyEmail=email;
 $('verifyEmailLabel').textContent=email;
 $('verifyPanel').hidden=false;
 $('verifyCode').value='';
}
async function signUp(){
 const email=$('signupEmail').value.trim().toLowerCase(),password=$('signupPassword').value,rep=$('signupPasswordRepeat').value;
 const btn=$('signupForm').querySelector('button');
 if(password!==rep){txt('signupStatus','Lösenorden matchar inte.');return;}
 btn.disabled=true;txt('signupStatus','Registrerar…');
 try{
  const j=await authPost('signup',{email,password});
  $('signupPassword').value='';$('signupPasswordRepeat').value='';
  if(j.access_token&&j.refresh_token){setSession(j);await load();}
  else {showVerification(email);txt('signupStatus','Kontrollera din mejl och ange koden nedan.');}
 }catch(e){txt('signupStatus',e.message);}
 finally{btn.disabled=false;}
}
async function verifySignUp(e){
 e.preventDefault();const btn=$('verifyForm').querySelector('button');const email=state.verifyEmail||$('signupEmail').value.trim().toLowerCase();const token=$('verifyCode').value.trim();
 if(!email||!/^[0-9]{6,10}$/.test(token)){txt('verifyStatus','Ange mejladress och koden från mejlet (6–10 siffror).');return;}
 btn.disabled=true;txt('verifyStatus','Bekräftar…');
 try{
  const j=await authPost('verify',{email,token,type:'email'});
  $('verifyForm').reset();
  if(j.access_token&&j.refresh_token){setSession(j);$('verifyPanel').hidden=true;await load();}
  else {txt('verifyStatus','Mejladressen är bekräftad. Logga in med ditt lösenord.');}
 }catch(err){txt('verifyStatus',err.message);}
 finally{btn.disabled=false;}
}
async function resendVerification(){
 const email=state.verifyEmail||$('signupEmail').value.trim().toLowerCase();
 if(!email){txt('verifyStatus','Ange din mejladress under Skapa konto först.');return;}
 const btn=$('resendVerify');btn.disabled=true;txt('verifyStatus','Begär ny kod…');
 try{await authPost('resend',{type:'signup',email});txt('verifyStatus','Om kontot väntar på bekräftelse har en ny kod skickats.');}
 catch(err){txt('verifyStatus',err.message);}
 finally{btn.disabled=false;}
}
async function recover(){
 const email=$('forgotEmail').value.trim().toLowerCase(),btn=$('forgotForm').querySelector('button');
 if(!email)return;
 btn.disabled=true;txt('forgotStatus','Skickar återställningskod…');
 try{
  await authPost('recover',{email});
  state.resetEmail=email;
  $('resetEmail').value=email;
  $('resetCode').value='';
  $('resetPanel').hidden=false;
  $('login').hidden=true;
  $('portalApp').hidden=true;
  txt('resetStatus','Om ett konto finns på adressen har vi skickat en kod på 6–10 siffror. Kontrollera även skräpposten.');
 }catch(e){txt('forgotStatus',e.message);}
 finally{btn.disabled=false;}
}
async function consumeCallback(){if(urlParams.has('error')){txt('loginStatus',urlParams.get('error_description')||'Bekräftelsen misslyckades.');history.replaceState(null,'',location.pathname);return false;}
if(urlParams.get('type')==='recovery'){history.replaceState(null,'',location.pathname);txt('loginStatus','Använd Glömt lösenord? och ange återställningskoden från mejlet.');return false;}
if(urlParams.has('access_token')&&urlParams.has('refresh_token')){setSession({access_token:urlParams.get('access_token'),refresh_token:urlParams.get('refresh_token'),expires_in:urlParams.get('expires_in')});state.resetting=urlParams.get('type')==='recovery';history.replaceState(null,'',location.pathname);if(state.resetting){$('login').hidden=false;$('resetPanel').hidden=true;$('portalApp').hidden=true;txt('loginStatus','Begär en ny kod via Glömt lösenord? för att återställa kontot.');state.resetting=false;}return true;}
const params=new URLSearchParams(location.search);if(params.get('code')){const code=params.get('code');const verifier=localStorage.getItem('ff_portal_pkce_verifier');if(!verifier){txt('loginStatus','Bekräftelselänken måste öppnas i samma webbläsare som registreringen eller begäras på nytt.');return false;}const j=await authPost('token?grant_type=pkce',{auth_code:code,code_verifier:verifier});setSession(j);history.replaceState(null,'',location.pathname);return true;}
return false;}
async function saveNewPassword(e){
 e.preventDefault();
 const email=$('resetEmail').value.trim().toLowerCase();
 const code=$('resetCode').value.trim();
 const password=$('newPassword').value;
 if(!email||!/^[0-9]{6,10}$/.test(code)){txt('resetStatus','Ange din mejladress och koden från mejlet (6–10 siffror).');return;}
 if(password.length<12){txt('resetStatus','Välj ett lösenord med minst 12 tecken.');return;}
 if(password!==$('newPasswordRepeat').value){txt('resetStatus','Lösenorden matchar inte.');return;}
 const btn=$('resetForm').querySelector('button');btn.disabled=true;
 txt('resetStatus','Verifierar koden och uppdaterar lösenordet…');
 try{
  // Använd bara sessionen som skapats genom verifierad återställningskod.
  const verified=await authPost('verify',{email,token:code,type:'recovery'});
  if(!verified.access_token)throw Error('Koden kunde inte verifieras. Begär en ny kod och försök igen.');
  const r=await fetch(base+'/auth/v1/user',{
   method:'PUT',
   headers:{apikey:key,'Authorization':'Bearer '+verified.access_token,'Content-Type':'application/json'},
   body:JSON.stringify({password})
  });
  if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.msg||j.message||j.error_description||'Det gick inte att uppdatera lösenordet.');}
  // Lämna ingen återställningssession inloggad på en delad enhet.
  await fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+verified.access_token}}).catch(()=>{});
  $('resetForm').reset();
  state.resetEmail='';
  showLogin();
  $('email').value=email;
  txt('loginStatus','Lösenordet är ändrat! Logga in med ditt nya lösenord.');
 }catch(err){
  txt('resetStatus',err.message||'Återställningen misslyckades. Begär en ny kod om den har gått ut.');
 }finally{btn.disabled=false;}
}
function clearPictures(){for(const u of state.photoUrls)URL.revokeObjectURL(u);state.photoUrls=[];}
function showLogin(){state.token='';state.refresh='';state.resetting=false;$('resetPanel').hidden=true;sessionStorage.removeItem('ff_customer_password_pilot_session');clearPictures();$('login').hidden=false;$('portalApp').hidden=true;}
function isCompleted(p){return /utförd|avslutad/i.test(String(p.status||'')) || /utförd/i.test(String(p.bokningsstatus||''));}
function jobState(p){const value=String(p.status||'Förfrågan mottagen');return {text:value,done:isCompleted(p)};}
function accountId(){try{const part=state.token.split('.')[1];const payload=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));if(!/^[0-9a-f-]{36}$/i.test(payload.sub||''))throw Error();return payload.sub;}catch{throw Error('Inloggningen behöver förnyas. Logga in igen.');}}
function visiblePortals(){return state.portals.filter(p=>!state.hiddenIds.has(p.id));}
function renderJobCards(){
 const root=$('jobCards'),hidden=$('hiddenJobCards');if(!root)return;root.replaceChildren();hidden?.replaceChildren();
 const portals=visiblePortals();if(!portals.length)add(root,'p',state.portals.length?'Du har dolt alla dina uppdrag. Du kan visa dem igen nedan.':'När du får en förfrågan eller offert visas uppdraget här.','empty-state');
 for(const p of state.portals){const isHidden=state.hiddenIds.has(p.id),parent=isHidden?hidden:root;if(!parent)continue;
 const wrap=add(parent,'div','','job-tile');const b=add(wrap,'button','','job-card');b.type='button';b.dataset.portalId=p.id;b.setAttribute('aria-pressed','false');
 const top=add(b,'div','','job-card-top');add(top,'span',p.tjanst||'Ditt uppdrag','job-name');add(top,'span',jobState(p).text,'job-status'+(isCompleted(p)?' completed':''));
 const meta=add(b,'div','','job-meta');add(meta,'span',p.bokningsdatum?'📅 '+date(p.bokningsdatum):'📩 '+date(String(p.skapad||'').slice(0,10)));add(meta,'span','Visa detaljer →','job-open');
 b.addEventListener('click',()=>{$('portalSelect').value=p.id;openPortal(p.id).then(()=>{$('selectedSummary').scrollIntoView({behavior:'smooth',block:'start'});}).catch(err=>txt('appStatus',err.message));});
 const action=add(wrap,'button',isHidden?'↩ Visa uppdrag igen':'Dölj från Mina sidor','job-visibility');action.type='button';action.addEventListener('click',()=>setJobVisibility(p,!isHidden,action));
 }
 if($('hiddenJobCount'))$('hiddenJobCount').textContent=String(state.hiddenIds.size);if(hidden)hidden.hidden=!state.hidePanelOpen;
 if($('toggleHiddenJobs')){$('toggleHiddenJobs').setAttribute('aria-expanded',String(state.hidePanelOpen));$('toggleHiddenJobs').firstChild.textContent=(state.hidePanelOpen?'Dölj listan':'Visa dolda uppdrag')+' (';}
}
async function loadHiddenJobs(){
 const rows=await request('/rest/v1/ff_portal_dolda_uppdrag?select=portal_id');state.hiddenIds=new Set((rows||[]).map(r=>r.portal_id));
}
async function setJobVisibility(p,hide,button){
 if(hide&&!await askDecision('Dölj uppdraget?', 'Uppdraget försvinner från din översikt, men din bokning, offert och företagets historik finns kvar. Du kan visa uppdraget igen när du vill.', 'Dölj uppdrag'))return;
 button.disabled=true;try{
 if(hide)await request('/rest/v1/ff_portal_dolda_uppdrag',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({portal_id:p.id,konto_id:accountId()})});
 else await request('/rest/v1/ff_portal_dolda_uppdrag?portal_id=eq.'+encodeURIComponent(p.id),{method:'DELETE'});
 await loadHiddenJobs();renderJobCards();renderPortalOptions();if($('jobCount'))$('jobCount').textContent=String(visiblePortals().length);if($('activeCount'))$('activeCount').textContent=String(visiblePortals().filter(p=>!isCompleted(p)).length);if($('doneCount'))$('doneCount').textContent=String(visiblePortals().filter(isCompleted).length);
 if(hide&&state.active===p.id){const next=visiblePortals()[0];if(next){await openPortal(next.id);}else{$('details').hidden=true;$('selectedSummary').hidden=true;}}
 txt('appStatus',hide?'Uppdraget är dolt. Du kan visa det igen under Dolda uppdrag.':'Uppdraget visas igen.');
 }catch(err){txt('appStatus','Kunde inte spara ändringen: '+err.message);}finally{button.disabled=false;}
}
function renderPortalOptions(){const select=$('portalSelect');select.replaceChildren();for(const p of visiblePortals()){const op=add(select,'option',(p.tjanst||'Uppdrag')+' · '+date((p.skapad||'').slice(0,10)));op.value=p.id;}}
async function askDecision(title,message,buttonText){return new Promise(resolve=>{const d=$('ffDecisionDialog');if(!d){resolve(false);return;}d.querySelector('[data-role="title"]').textContent=title;d.querySelector('[data-role="message"]').textContent=message;d.querySelector('[data-role="confirm"]').textContent=buttonText;const yes=d.querySelector('[data-role="confirm"]'),no=d.querySelector('[data-role="cancel"]');let settled=false;function end(result){if(settled)return;settled=true;yes.removeEventListener('click',accept);no.removeEventListener('click',reject);d.removeEventListener('cancel',cancel);d.close();resolve(result);}function accept(){end(true);}function reject(){end(false);}function cancel(e){e.preventDefault();end(false);}yes.addEventListener('click',accept);no.addEventListener('click',reject);d.addEventListener('cancel',cancel);d.showModal();});}
function updateJobSummary(p){const summary=$('selectedSummary');if(summary){summary.hidden=false;txt('selectedTitle',p.tjanst||'Ditt uppdrag');txt('selectedStage',p.status||'Pågående');let next='Vi håller dig uppdaterad här när något händer.';const stat=String(p.status||'').toLowerCase();if(isCompleted(p))next='Uppdraget är avslutat. Se sammanfattning och tidigare uppdateringar längre ner.';else if(/offert skickad/.test(stat))next='Din offert är skickad. Kontrollera pris och innehåll nedan.';else if(/bokad|accepterad/.test(stat))next='Se datum och tid under Din bokning. Behöver du ändra något kan du skicka ett önskemål.';else if(/förfrågan|på gång/.test(stat))next='Vi har tagit emot din förfrågan och arbetar med nästa steg.';txt('selectedNext',next);}const root=$('jobCards');if(root)for(const el of root.querySelectorAll('[data-portal-id]')){const yes=el.dataset.portalId===p.id;el.classList.toggle('selected',yes);el.setAttribute('aria-pressed',String(yes));}}
async function load(){await request('/rest/v1/rpc/ff_portal_auto_synka',{method:'POST',body:JSON.stringify({})});const items=await request('/rest/v1/ff_kundportaler?select=*&order=skapad.desc');state.portals=items||[];await loadHiddenJobs();$('login').hidden=true;$('portalApp').hidden=false;
 if($('jobCount'))$('jobCount').textContent=String(visiblePortals().length);
 if($('activeCount'))$('activeCount').textContent=String(visiblePortals().filter(p=>!isCompleted(p)).length);
 if($('doneCount'))$('doneCount').textContent=String(visiblePortals().filter(isCompleted).length);
 renderJobCards();renderPortalOptions();if(!state.portals.length){$('details').hidden=true;$('selectedSummary').hidden=true;txt('appStatus','Inga tidigare uppdrag hittades för din verifierade mejladress.');return;}
 txt('who',state.portals[0].kundnamn||'välkommen');txt('appStatus','');const first=visiblePortals()[0];if(!first){$('details').hidden=true;$('selectedSummary').hidden=true;return;}
 $('portalSelect').value=state.active&&visiblePortals().some(p=>p.id===state.active)?state.active:first.id;await openPortal($('portalSelect').value);}
async function openPortal(id){state.active=id;let p=state.portals.find(x=>x.id===id);if(!p)return;
await request('/rest/v1/rpc/ff_portal_synka',{method:'POST',body:JSON.stringify({p_portal:id})});
const fresh=await request('/rest/v1/ff_kundportaler?select=*&id=eq.'+encodeURIComponent(id));
if(fresh?.[0]){p=fresh[0];state.portals=state.portals.map(x=>x.id===id?p:x);}$('details').hidden=false;updateJobSummary(p);txt('state',p.status);$('offerDetails').replaceChildren();line('offerDetails','Tjänst',p.tjanst);line('offerDetails','Pris inkl. moms',kr(p.offertpris));line('offerDetails','Giltig till',date(p.offert_giltig_till));line('offerDetails','Omfattning',p.offerttext||'Vi arbetar på ditt personliga prisförslag.');$('bookingDetails').replaceChildren();line('bookingDetails','Status',p.bokningsstatus);line('bookingDetails','Datum',date(p.bokningsdatum));line('bookingDetails','Tid',p.bokning_start&&p.bokning_slut?p.bokning_start.slice(0,5)+'–'+p.bokning_slut.slice(0,5):'Inte bekräftad');line('bookingDetails','Adress/område',p.adress);txt('completion',p.sammanfattning||'När jobbet är slutfört kan vi publicera en sammanfattning här.');
await Promise.all([loadTimeline(),loadChanges(),loadPhotos()]);renderChecklist();}
async function loadTimeline(){const list=await request('/rest/v1/ff_portal_handelser?select=*&portal_id=eq.'+encodeURIComponent(state.active)+'&order=skapad.desc&limit=25');const box=$('timeline');box.replaceChildren();if(!list.length)add(box,'p','Inga uppdateringar ännu.','hint');for(const e of list){const d=add(box,'div','','entry');add(d,'strong',e.rubrik);if(e.meddelande)add(d,'p',e.meddelande);add(d,'small',dateTime(e.skapad));}}
async function loadChanges(){const list=await request('/rest/v1/ff_portal_andringar?select=*&portal_id=eq.'+encodeURIComponent(state.active)+'&order=skapad.desc&limit=25');const box=$('changes');box.replaceChildren();if(!list.length)add(box,'p','Inga ändringsförfrågningar.','hint');for(const e of list){const d=add(box,'div','','entry');add(d,'strong',e.typ+' · '+e.status);add(d,'p',e.meddelande);if(e.admin_svar)add(d,'p','Svar: '+e.admin_svar);add(d,'small',dateTime(e.skapad));}}
async function submitChange(e){e.preventDefault();const body={portal_id:state.active,typ:$('changeType').value,meddelande:$('changeMessage').value.trim(),onskat_datum:$('wantedDate').value||null};if(body.meddelande.length<5)return;const b=$('changeForm').querySelector('button');b.disabled=true;try{await request('/rest/v1/ff_portal_andringar',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});$('changeForm').reset();txt('changeStatus','Önskemålet är registrerat! Bokningen ändras inte förrän vi bekräftar det.');await loadChanges();}catch(err){txt('changeStatus',err.message);}finally{b.disabled=false;}}
async function loadPhotos(){clearPictures();const box=$('photoGrid');box.replaceChildren();const list=await request('/rest/v1/ff_portal_bilder?select=*&portal_id=eq.'+encodeURIComponent(state.active)+'&order=skapad.desc');box.dataset.count=String(list.length);if(!list.length){add(box,'p','Inga bilder uppladdade ännu.','hint');return;}
 for(const f of list){const card=add(box,'div','','ff-photo-card');const a=add(card,'a',f.filnamn,'ff-photo-preview');a.href='#';
 try{const r=await fetch(base+'/storage/v1/object/authenticated/ff-kundbilder/'+f.path.split('/').map(encodeURIComponent).join('/'),{headers:headers(true)});if(!r.ok)throw Error();const objectUrl=URL.createObjectURL(await r.blob());state.photoUrls.push(objectUrl);a.href=objectUrl;a.target='_blank';a.rel='noopener noreferrer';const img=document.createElement('img');img.src=objectUrl;img.alt='Uppladdad bild: '+f.filnamn;a.prepend(img);}catch{a.textContent=f.filnamn+' (kunde inte visa bild)';a.removeAttribute('href');}
 const remove=add(card,'button','Ta bort bild','ff-photo-remove');remove.type='button';remove.setAttribute('aria-label','Ta bort '+f.filnamn);
 remove.addEventListener('click',async()=>{if(state.active!==f.portal_id)return;if(!await askDecision('Ta bort bilden?', 'Bilden ”'+f.filnamn+'” kommer att raderas permanent. Åtgärden går inte att ångra.','Ta bort bilden'))return;remove.disabled=true;txt('photoStatus','Tar bort bilden…');try{
 const res=await fetch(base+'/storage/v1/object/ff-kundbilder/'+f.path.split('/').map(encodeURIComponent).join('/'),{method:'DELETE',headers:headers(true)});
 if(!res.ok){const j=await res.json().catch(()=>({}));throw Error(j.message||'Kunde inte radera bildfilen (HTTP '+res.status+'). Kontrollera Storage-behörigheterna.');}
 await request('/rest/v1/ff_portal_bilder?id=eq.'+encodeURIComponent(f.id)+'&portal_id=eq.'+encodeURIComponent(f.portal_id),{method:'DELETE'});
 txt('photoStatus','Bilden har tagits bort.');await loadPhotos();
 }catch(err){txt('photoStatus','Raderingen kunde inte slutföras: '+err.message+' Om filen redan är borta, kontakta oss så att den tas bort från listan.');remove.disabled=false;}});
 }}
async function submitPhotos(e){e.preventDefault();const files=[...$('photos').files],current=Number($('photoGrid').dataset.count||0),b=$('photoForm').querySelector('button');if(!files.length)return;if(current+files.length>5){txt('photoStatus','Högst 5 bilder per uppdrag.');return;}b.disabled=true;txt('photoStatus','Laddar upp…');try{for(const f of files){if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)throw Error('En bild har fel format eller är större än 8 MB.');const ext=f.type==='image/jpeg'?'jpg':f.type==='image/png'?'png':'webp',path=state.active+'/'+crypto.randomUUID()+'.'+ext;let r=await fetch(base+'/storage/v1/object/ff-kundbilder/'+path,{method:'POST',headers:{...headers(true),'Content-Type':f.type,'x-upsert':'false'},body:f});if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.message||'Uppladdningen misslyckades.');}await request('/rest/v1/ff_portal_bilder',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({portal_id:state.active,path,filnamn:f.name.slice(0,200)})});}txt('photoStatus','Bilderna har laddats upp.');$('photoForm').reset();await loadPhotos();}catch(err){txt('photoStatus',err.message);}finally{b.disabled=false;}}
const steps=[
 {group:'Bokning & kontakt',name:'Kontrollera datum och tid',description:'Se att dagen och tiderna för ditt uppdrag stämmer.'},
 {group:'Bokning & kontakt',name:'Kontrollera adress och portkod',description:'Dubbelkolla adress, våning, portkod och eventuell hiss.'},
 {group:'Bokning & kontakt',name:'Se över kontaktuppgifterna',description:'Se till att vi kan nå dig på uppdragsdagen.'},
 {group:'Inför vårt besök',name:'Ordna nycklar och tillträde',description:'Bestäm hur personalen kommer in i bostaden.'},
 {group:'Inför vårt besök',name:'Planera parkering och lastzon',description:'Berätta var vi får parkera eller ställa flyttbilen.'},
 {group:'Inför vårt besök',name:'Säkra husdjur och känsliga föremål',description:'Ordna en trygg plats för husdjur och lägg undan värdesaker.'},
 {group:'Inför vårt besök',name:'Informera om tunga eller ömtåliga saker',description:'Till exempel piano, kassaskåp eller stora möbler.'},
 {group:'Förbered bostaden',name:'Packa eller plocka undan',description:'Gör ytor fria så långt det är möjligt för det arbete som bokats.'},
 {group:'Förbered bostaden',name:'Kontrollera vatten, el och belysning',description:'Se att sådant som behövs för tjänsten finns tillgängligt.'},
 {group:'Förbered bostaden',name:'Ta bilder på sådant vi bör känna till',description:'Ladda gärna upp relevanta bilder i avsnittet ovan.'},
 {group:'Sista kontrollen',name:'Meddela särskilda önskemål i god tid',description:'Skicka ett ändringsönskemål om något behöver justeras.'},
 {group:'Sista kontrollen',name:'Gå igenom bokningen en sista gång',description:'Se över datum, omfattning och eventuella tillval.'}
];
function renderChecklist(){const root=$('checklist');root.replaceChildren();const k='ff_check_v6_'+state.active;let checked=[];try{checked=JSON.parse(localStorage.getItem(k)||'[]');if(!Array.isArray(checked))checked=[];}catch{}let group='';
 steps.forEach((step,i)=>{if(step.group!==group){group=step.group;add(root,'h3',group,'ff-check-group');}
 const l=document.createElement('label');l.className='ff-check-row';const c=document.createElement('input');c.type='checkbox';c.checked=checked.includes(i);const content=add(l,'span','','ff-check-copy');add(content,'strong',step.name);add(content,'small',step.description);const status=add(l,'span',c.checked?'Klart':'Återstår','ff-check-state');l.prepend(c);l.classList.toggle('complete',c.checked);
 c.addEventListener('change',()=>{let stored=[];try{stored=JSON.parse(localStorage.getItem(k)||'[]');if(!Array.isArray(stored))stored=[];}catch{}stored=stored.filter(x=>x!==i);if(c.checked)stored.push(i);localStorage.setItem(k,JSON.stringify(stored));status.textContent=c.checked?'Klart':'Återstår';l.classList.toggle('complete',c.checked);});root.append(l);});}
async function start(){if(!base.startsWith('https://')||!key){txt('loginStatus','Supabase-konfiguration saknas.');return;}try{const fromLink=await consumeCallback();if(!fromLink){const saved=JSON.parse(sessionStorage.getItem('ff_customer_password_pilot_session')||'null');if(saved){state.token=saved.token;state.refresh=saved.refresh;state.expires=saved.expires;}}if(state.token&&!state.resetting){await load();}}catch(err){showLogin();txt('loginStatus',err.message);}}
$('loginForm').addEventListener('submit',e=>{e.preventDefault();signIn();});$('signupForm').addEventListener('submit',e=>{e.preventDefault();signUp();});$('verifyForm').addEventListener('submit',verifySignUp);$('resendVerify').addEventListener('click',resendVerification);$('forgotForm').addEventListener('submit',e=>{e.preventDefault();recover();});$('resetForm').addEventListener('submit',saveNewPassword);$('resetBackButton').addEventListener('click',()=>{$('resetPanel').hidden=true;$('login').hidden=false;});$('logout').addEventListener('click',async()=>{const token=state.token;showLogin();if(token)fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token}}).catch(()=>{});});$('portalSelect').addEventListener('change',e=>openPortal(e.target.value).catch(err=>txt('appStatus',err.message)));$('changeForm').addEventListener('submit',submitChange);$('photoForm').addEventListener('submit',submitPhotos);$('toggleHiddenJobs')?.addEventListener('click',()=>{state.hidePanelOpen=!state.hidePanelOpen;renderJobCards();});start();
})();
