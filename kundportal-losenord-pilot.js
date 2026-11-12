(()=>{'use strict';
const cfg=window.FLYTT_CONFIG||{},base=(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabaseAnonKey||'';
const $=s=>document.getElementById(s), txt=(id,value)=>{$(id).textContent=value==null||value===''?'–':String(value);};
const state={token:'',refresh:'',expires:0,portals:[],active:null,photoUrls:[],resetting:false,verifyEmail:''};
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
 if(!email||!/^[0-9]{6,8}$/.test(token)){txt('verifyStatus','Ange mejladress och den 6–8-siffriga koden.');return;}
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
async function recover(){const email=$('forgotEmail').value.trim().toLowerCase(),btn=$('forgotForm').querySelector('button');btn.disabled=true;try{await authPost('recover',{email,redirect_to:location.origin+location.pathname});txt('forgotStatus','Om kontot finns kommer ett återställningsmejl. Kontrollera skräpposten.');}catch(e){txt('forgotStatus',e.message);}finally{btn.disabled=false;}}
async function consumeCallback(){if(urlParams.has('error')){txt('loginStatus',urlParams.get('error_description')||'Bekräftelsen misslyckades.');history.replaceState(null,'',location.pathname);return false;}
if(urlParams.has('access_token')&&urlParams.has('refresh_token')){setSession({access_token:urlParams.get('access_token'),refresh_token:urlParams.get('refresh_token'),expires_in:urlParams.get('expires_in')});state.resetting=urlParams.get('type')==='recovery';history.replaceState(null,'',location.pathname);if(state.resetting){$('login').hidden=true;$('resetPanel').hidden=false;$('portalApp').hidden=true;}return true;}
const params=new URLSearchParams(location.search);if(params.get('code')){const code=params.get('code');const verifier=localStorage.getItem('ff_portal_pkce_verifier');if(!verifier){txt('loginStatus','Bekräftelselänken måste öppnas i samma webbläsare som registreringen eller begäras på nytt.');return false;}const j=await authPost('token?grant_type=pkce',{auth_code:code,code_verifier:verifier});setSession(j);history.replaceState(null,'',location.pathname);return true;}
return false;}
async function saveNewPassword(e){e.preventDefault();const password=$('newPassword').value;if(password!==$('newPasswordRepeat').value){txt('resetStatus','Lösenorden matchar inte.');return;}const btn=$('resetForm').querySelector('button');btn.disabled=true;try{if(state.expires-Date.now()<50000)await renew();const r=await fetch(base+'/auth/v1/user',{method:'PUT',headers:{...headers(true),'Content-Type':'application/json'},body:JSON.stringify({password})});if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.msg||j.message||'Det gick inte att uppdatera lösenordet.');}state.resetting=false;$('resetPanel').hidden=true;$('resetForm').reset();await load();}catch(err){txt('resetStatus',err.message);}finally{btn.disabled=false;}}
function clearPictures(){for(const u of state.photoUrls)URL.revokeObjectURL(u);state.photoUrls=[];}
function showLogin(){state.token='';state.refresh='';state.resetting=false;$('resetPanel').hidden=true;sessionStorage.removeItem('ff_customer_password_pilot_session');clearPictures();$('login').hidden=false;$('portalApp').hidden=true;}
async function load(){await request('/rest/v1/rpc/ff_portal_auto_synka',{method:'POST',body:JSON.stringify({})});const [items]=await Promise.all([request('/rest/v1/ff_kundportaler?select=*&order=skapad.desc')]);state.portals=items||[];$('login').hidden=true;$('portalApp').hidden=false;const select=$('portalSelect');select.replaceChildren();if(!state.portals.length){$('details').hidden=true;txt('appStatus','Inga tidigare förfrågningar, offerter eller bokningar hittades för din verifierade mejladress.');return;}txt('who',state.portals[0].kundnamn||'välkommen');txt('appStatus','');for(const p of state.portals){const op=add(select,'option',(p.tjanst||'Uppdrag')+' · '+date(p.skapad.slice(0,10)));op.value=p.id;}select.value=state.active&&state.portals.some(p=>p.id===state.active)?state.active:state.portals[0].id;await openPortal(select.value);}
async function openPortal(id){state.active=id;let p=state.portals.find(x=>x.id===id);if(!p)return;
await request('/rest/v1/rpc/ff_portal_synka',{method:'POST',body:JSON.stringify({p_portal:id})});
const fresh=await request('/rest/v1/ff_kundportaler?select=*&id=eq.'+encodeURIComponent(id));
if(fresh?.[0]){p=fresh[0];state.portals=state.portals.map(x=>x.id===id?p:x);}$('details').hidden=false;txt('state',p.status);$('offerDetails').replaceChildren();line('offerDetails','Tjänst',p.tjanst);line('offerDetails','Pris inkl. moms',kr(p.offertpris));line('offerDetails','Giltig till',date(p.offert_giltig_till));line('offerDetails','Omfattning',p.offerttext||'Vi arbetar på ditt personliga prisförslag.');$('bookingDetails').replaceChildren();line('bookingDetails','Status',p.bokningsstatus);line('bookingDetails','Datum',date(p.bokningsdatum));line('bookingDetails','Tid',p.bokning_start&&p.bokning_slut?p.bokning_start.slice(0,5)+'–'+p.bokning_slut.slice(0,5):'Inte bekräftad');line('bookingDetails','Adress/område',p.adress);txt('completion',p.sammanfattning||'När jobbet är slutfört kan vi publicera en sammanfattning här.');
await Promise.all([loadTimeline(),loadChanges(),loadPhotos()]);renderChecklist();}
async function loadTimeline(){const list=await request('/rest/v1/ff_portal_handelser?select=*&portal_id=eq.'+encodeURIComponent(state.active)+'&order=skapad.desc&limit=25');const box=$('timeline');box.replaceChildren();if(!list.length)add(box,'p','Inga uppdateringar ännu.','hint');for(const e of list){const d=add(box,'div','','entry');add(d,'strong',e.rubrik);if(e.meddelande)add(d,'p',e.meddelande);add(d,'small',dateTime(e.skapad));}}
async function loadChanges(){const list=await request('/rest/v1/ff_portal_andringar?select=*&portal_id=eq.'+encodeURIComponent(state.active)+'&order=skapad.desc&limit=25');const box=$('changes');box.replaceChildren();if(!list.length)add(box,'p','Inga ändringsförfrågningar.','hint');for(const e of list){const d=add(box,'div','','entry');add(d,'strong',e.typ+' · '+e.status);add(d,'p',e.meddelande);if(e.admin_svar)add(d,'p','Svar: '+e.admin_svar);add(d,'small',dateTime(e.skapad));}}
async function submitChange(e){e.preventDefault();const body={portal_id:state.active,typ:$('changeType').value,meddelande:$('changeMessage').value.trim(),onskat_datum:$('wantedDate').value||null};if(body.meddelande.length<5)return;const b=$('changeForm').querySelector('button');b.disabled=true;try{await request('/rest/v1/ff_portal_andringar',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});$('changeForm').reset();txt('changeStatus','Önskemålet är registrerat! Bokningen ändras inte förrän vi bekräftar det.');await loadChanges();}catch(err){txt('changeStatus',err.message);}finally{b.disabled=false;}}
async function loadPhotos(){clearPictures();const box=$('photoGrid');box.replaceChildren();const list=await request('/rest/v1/ff_portal_bilder?select=*&portal_id=eq.'+encodeURIComponent(state.active)+'&order=skapad.desc');box.dataset.count=String(list.length);if(!list.length){add(box,'p','Inga bilder uppladdade ännu.','hint');return;}for(const f of list){const a=add(box,'a',f.filnamn);a.href='#';try{const r=await fetch(base+'/storage/v1/object/authenticated/ff-kundbilder/'+f.path.split('/').map(encodeURIComponent).join('/'),{headers:headers(true)});if(!r.ok)throw Error();const objectUrl=URL.createObjectURL(await r.blob());state.photoUrls.push(objectUrl);a.href=objectUrl;a.target='_blank';a.rel='noopener noreferrer';const img=document.createElement('img');img.src=objectUrl;img.alt='Uppladdad bild: '+f.filnamn;a.prepend(img);}catch{a.textContent=f.filnamn+' (kunde inte visa bild)';}}}
async function submitPhotos(e){e.preventDefault();const files=[...$('photos').files],current=Number($('photoGrid').dataset.count||0),b=$('photoForm').querySelector('button');if(!files.length)return;if(current+files.length>5){txt('photoStatus','Högst 5 bilder per uppdrag.');return;}b.disabled=true;txt('photoStatus','Laddar upp…');try{for(const f of files){if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)throw Error('En bild har fel format eller är större än 8 MB.');const ext=f.type==='image/jpeg'?'jpg':f.type==='image/png'?'png':'webp',path=state.active+'/'+crypto.randomUUID()+'.'+ext;let r=await fetch(base+'/storage/v1/object/ff-kundbilder/'+path,{method:'POST',headers:{...headers(true),'Content-Type':f.type,'x-upsert':'false'},body:f});if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.message||'Uppladdningen misslyckades.');}await request('/rest/v1/ff_portal_bilder',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({portal_id:state.active,path,filnamn:f.name.slice(0,200)})});}txt('photoStatus','Bilderna har laddats upp.');$('photoForm').reset();await loadPhotos();}catch(err){txt('photoStatus',err.message);}finally{b.disabled=false;}}
const steps=['Kontrollera datum och adress','Packa eller planera städningen','Ordna nycklar och tillgång till bostaden','Meddela oss om tunga eller ömtåliga föremål','Kontrollera bokningsuppgifterna innan uppdraget'];
function renderChecklist(){const root=$('checklist');root.replaceChildren();const k='ff_check_'+state.active;let checked=[];try{checked=JSON.parse(localStorage.getItem(k)||'[]');}catch{}steps.forEach((text,i)=>{const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=checked.includes(i);c.addEventListener('change',()=>{let stored=[];try{stored=JSON.parse(localStorage.getItem(k)||'[]');}catch{}stored=stored.filter(x=>x!==i);if(c.checked)stored.push(i);localStorage.setItem(k,JSON.stringify(stored));});l.append(c,document.createTextNode(text));root.append(l);});}
async function start(){if(!base.startsWith('https://')||!key){txt('loginStatus','Supabase-konfiguration saknas.');return;}try{const fromLink=await consumeCallback();if(!fromLink){const saved=JSON.parse(sessionStorage.getItem('ff_customer_password_pilot_session')||'null');if(saved){state.token=saved.token;state.refresh=saved.refresh;state.expires=saved.expires;}}if(state.token&&!state.resetting){await load();}}catch(err){showLogin();txt('loginStatus',err.message);}}
$('loginForm').addEventListener('submit',e=>{e.preventDefault();signIn();});$('signupForm').addEventListener('submit',e=>{e.preventDefault();signUp();});$('verifyForm').addEventListener('submit',verifySignUp);$('resendVerify').addEventListener('click',resendVerification);$('forgotForm').addEventListener('submit',e=>{e.preventDefault();recover();});$('resetForm').addEventListener('submit',saveNewPassword);$('logout').addEventListener('click',async()=>{const token=state.token;showLogin();if(token)fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token}}).catch(()=>{});});$('portalSelect').addEventListener('change',e=>openPortal(e.target.value).catch(err=>txt('appStatus',err.message)));$('changeForm').addEventListener('submit',submitChange);$('photoForm').addEventListener('submit',submitPhotos);start();
})();
