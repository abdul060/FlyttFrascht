(function(){
'use strict';
const cfg=window.FLYTT_CONFIG||{};
const $=id=>document.getElementById(id);
const url=(cfg.supabaseUrl||'').replace(/\/$/,'');
const key=cfg.supabaseAnonKey||'';
let token='',refreshToken='',records=[];
const validConfig=url.startsWith('https://')&&!url.includes('DITT-PROJEKT')&&key&&!key.includes('DIN_SUPABASE');
const authUrl=url+'/auth/v1/token?grant_type=';
function headers(auth){return {'apikey':key,...(auth?{'Authorization':'Bearer '+auth}:{}),'Content-Type':'application/json'};}
function setNotice(msg){$('notice').textContent=msg;}
function showLogin(){token='';refreshToken='';sessionStorage.removeItem('flytt_admin_session');$('loginPanel').hidden=false;$('dashboard').hidden=true;}
function showDashboard(){$('loginPanel').hidden=true;$('dashboard').hidden=false;load();}
async function login(username,password){
 if(username.trim().toLowerCase()!==(cfg.adminUsername||'abdul').toLowerCase())throw Error('Fel användarnamn eller lösenord.');
 const resp=await fetch(authUrl+'password',{method:'POST',headers:headers(),body:JSON.stringify({email:cfg.adminEmail,password})});
 if(!resp.ok)throw Error('Fel användarnamn eller lösenord.');
 const json=await resp.json();token=json.access_token;refreshToken=json.refresh_token;
 sessionStorage.setItem('flytt_admin_session',JSON.stringify({token,refreshToken}));
}
async function refresh(){
 if(!refreshToken)return false;
 try{const resp=await fetch(authUrl+'refresh_token',{method:'POST',headers:headers(),body:JSON.stringify({refresh_token:refreshToken})});
 if(!resp.ok)return false;const j=await resp.json();token=j.access_token;refreshToken=j.refresh_token;
 sessionStorage.setItem('flytt_admin_session',JSON.stringify({token,refreshToken}));return true;}catch{return false;}
}
async function api(path,method='GET',body,tryRefresh=true){
 const r=await fetch(url+'/rest/v1/'+path,{method,headers:{...headers(token),...(method==='PATCH'?{'Prefer':'return=minimal'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(r.status===401&&tryRefresh&&await refresh())return api(path,method,body,false);
 if(!r.ok){if(r.status===401)showLogin();throw Error('Kunde inte läsa eller ändra offerterna (HTTP '+r.status+'). Kontrollera att admin-kontot finns i databasen och att RLS-reglerna är installerade.');}
 return method==='GET'?await r.json():null;
}
function ele(name,text){const e=document.createElement(name);if(text!==undefined)e.textContent=String(text);return e;}
function field(dl,label,value){const box=ele('div');box.append(ele('dt',label),ele('dd',value??'–'));dl.append(box);}
function draw(){
 const search=$('search').value.trim().toLocaleLowerCase('sv'),f=$('filter').value;
 $('total').textContent=records.length;$('newCount').textContent=records.filter(x=>x.status==='ny').length;$('doneCount').textContent=records.filter(x=>x.status==='klar').length;
 const list=records.filter(x=>(f==='alla'||x.status===f)&&[x.namn,x.telefon,x.epost,x.tjanst,x.adress].some(v=>String(v||'').toLocaleLowerCase('sv').includes(search)));
 const root=$('quotes');root.replaceChildren();
 if(!list.length){root.append(ele('p','Inga offertförfrågningar att visa.')).className='empty';return;}
 for(const x of list){
  const card=ele('article');card.className='quote';const head=ele('div');head.className='head';head.append(ele('h2',x.namn||'Namnlös offert'),ele('strong',x.tjanst||'Okänd tjänst'));
  card.append(head,ele('p','Inkommen: '+new Date(x.skapad).toLocaleString('sv-SE',{dateStyle:'medium',timeStyle:'short'})));
  const dl=ele('dl');field(dl,'Telefon',x.telefon);field(dl,'E-post',x.epost);field(dl,'Adress/område',x.adress);field(dl,'Önskat datum',x.onskat_datum);field(dl,'Storlek',x.storlek_kvm?x.storlek_kvm+' m²':'–');field(dl,'Antal rum',x.rum);field(dl,'Rimligt pris',x.rimligt_pris===null?'–':x.rimligt_pris+' kr');field(dl,'Meddelande',x.meddelande);card.append(dl);
  const footer=ele('div');footer.className='footer';footer.append(ele('span','Status: '));
  const status=ele('select');[['ny','Ny'],['kontaktad','Kontaktad'],['klar','Avslutad']].forEach(([v,label])=>{const o=ele('option',label);o.value=v;status.append(o)});status.value=x.status;
  status.addEventListener('change',async()=>{status.disabled=true;try{await api('offertforfragningar?id=eq.'+encodeURIComponent(x.id),'PATCH',{status:status.value});x.status=status.value;setNotice('Status sparad.');draw();}catch(e){setNotice(e.message);status.value=x.status;}finally{status.disabled=false;}});
  footer.append(status);if(x.telefon){const tel=ele('a','Ring kund');tel.href='tel:'+x.telefon.replace(/[^+\d]/g,'');footer.append(tel)}if(x.epost){const mail=ele('a','Mejla kund');mail.href='mailto:'+encodeURIComponent(x.epost);footer.append(mail)}
  card.append(footer);root.append(card);
 }
}
async function load(){setNotice('Laddar offerter…');try{records=await api('offertforfragningar?select=*&order=skapad.desc&limit=500');setNotice('');draw();}catch(e){setNotice(e.message);}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';$('loginBtn').disabled=true;
 try{if(!validConfig)throw Error('Supabase måste konfigureras i config.js först.');await login($('username').value,$('password').value);$('password').value='';showDashboard();}
 catch(e){$('loginError').textContent=e.message;}finally{$('loginBtn').disabled=false;}});
$('logoutBtn').addEventListener('click',()=>{showLogin();});
$('refreshBtn').addEventListener('click',load);$('search').addEventListener('input',draw);$('filter').addEventListener('change',draw);
try{const saved=JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null');if(saved&&validConfig){token=saved.token;refreshToken=saved.refreshToken;showDashboard();}}catch{}
})();
