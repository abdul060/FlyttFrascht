(function(){
'use strict';
const cfg=window.FLYTT_CONFIG||{},$=id=>document.getElementById(id),url=(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabaseAnonKey||'';
let token='',refreshToken='',records=[],offers=[],bookings=[],editingBookingId=null,calendarDate=new Date(),selectedBookingDate='',currentTab='requests',poller=null,lastIds=null;
const validConfig=url.startsWith('https://')&&!!key;
function headers(auth){return {'apikey':key,...(auth?{'Authorization':'Bearer '+auth}:{}),'Content-Type':'application/json'};}
function notice(s){$('notice').textContent=s||'';}
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x;}
function addLink(parent,text,href){const a=el('a',text);a.href=href;parent.append(a);return a;}
function field(dl,l,v){const box=el('div');box.append(el('dt',l),el('dd',v===null||v===undefined||v===''?'–':v));dl.append(box);}
function dateFormat(s){return s?new Date(s).toLocaleString('sv-SE',{dateStyle:'medium',timeStyle:'short'}):'–';}
function money(n){return Number(n).toLocaleString('sv-SE',{maximumFractionDigits:2})+' kr';}
function identity(x){return x.epost&&x.epost.includes('@')?'e:'+x.epost.trim().toLocaleLowerCase('sv'):'t:'+String(x.telefon||'').replace(/[^0-9]/g,'');}
function customersData(){const m=new Map();for(const r of records){const id=identity(r);if(id==='t:')continue;if(!m.has(id))m.set(id,{name:r.namn,phone:r.telefon,email:r.epost,items:[]});m.get(id).items.push(r);}return [...m.values()].sort((a,b)=>new Date(b.items[0].skapad)-new Date(a.items[0].skapad));}
function showLogin(){token='';refreshToken='';sessionStorage.removeItem('flytt_admin_session');$('loginPanel').hidden=false;$('dashboard').hidden=true;if(poller){clearInterval(poller);poller=null;}}
function showDashboard(){$('loginPanel').hidden=true;$('dashboard').hidden=false;switchTab('requests');reload(true);if(!poller)poller=setInterval(()=>reload(false),30000);}
function authUrl(type){return url+'/auth/v1/token?grant_type='+type;}
async function login(username,password){if(username.trim().toLowerCase()!==(cfg.adminUsername||'abdul').toLowerCase())throw Error('Fel användarnamn eller lösenord.');const resp=await fetch(authUrl('password'),{method:'POST',headers:headers(),body:JSON.stringify({email:cfg.adminEmail,password})});if(!resp.ok)throw Error('Fel användarnamn eller lösenord.');const j=await resp.json();token=j.access_token;refreshToken=j.refresh_token;saveSession();}
function saveSession(){sessionStorage.setItem('flytt_admin_session',JSON.stringify({token,refreshToken}));}
async function refresh(){if(!refreshToken)return false;try{const r=await fetch(authUrl('refresh_token'),{method:'POST',headers:headers(),body:JSON.stringify({refresh_token:refreshToken})});if(!r.ok)return false;const j=await r.json();token=j.access_token;refreshToken=j.refresh_token;saveSession();return true;}catch{return false;}}
async function api(path,method='GET',body,retry=true){const r=await fetch(url+'/rest/v1/'+path,{method,headers:{...headers(token),...(method==='POST'?{'Prefer':'return=representation'}:{}),...(method==='PATCH'?{'Prefer':'return=minimal'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});if(r.status===401&&retry&&await refresh())return api(path,method,body,false);if(!r.ok){if(r.status===401)showLogin();const info=await r.json().catch(()=>({}));throw Error(info.message||'Databasen svarade med HTTP '+r.status+'. Kontrollera SQL-reglerna.');}return method==='GET'||method==='POST'?r.json():null;}
function switchTab(tab){if(tab==='bookings')setTimeout(scheduleAvailability,0);currentTab=tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));['requests','customers','offers','bookings'].forEach(t=>$(t+'Panel').hidden=t!==tab);render();}
function render(){const cs=customersData();$('total').textContent=records.length;$('newCount').textContent=records.filter(r=>r.status==='ny').length;$('customerCount').textContent=cs.length;$('sentCount').textContent=offers.filter(x=>x.status==='skickad').length;$('tabNew').textContent=records.filter(r=>r.status==='ny').length?'('+records.filter(r=>r.status==='ny').length+')':'';drawRequests();drawCustomers(cs);drawOffers();fillRequestOptions();fillBookingOptions();drawCalendar();}
function drawRequests(){const search=$('search').value.toLocaleLowerCase('sv').trim(),f=$('filter').value,root=$('quotes');root.replaceChildren();const list=records.filter(r=>(f==='alla'||r.status===f)&&[r.namn,r.telefon,r.epost,r.tjanst,r.adress].some(v=>String(v||'').toLocaleLowerCase('sv').includes(search)));if(!list.length){root.append(el('p','Inga förfrågningar matchar sökningen.','empty'));return;}
for(const r of list){const card=el('article',undefined,'quote'),h=el('div',undefined,'head');h.append(el('h2',r.namn),el('strong',r.tjanst));card.append(h,el('p','Inkommen: '+dateFormat(r.skapad),'meta'));const dl=el('dl');[['Telefon',r.telefon],['E-post',r.epost],['Adress',r.adress],['Önskat datum',r.onskat_datum],['Storlek',r.storlek_kvm+' m²'],['Rum',r.rum],['Prisförslag',r.rimligt_pris===null?'–':money(r.rimligt_pris)],['Meddelande',r.meddelande]].forEach(([l,v])=>field(dl,l,v));card.append(dl);const ft=el('div',undefined,'footer'),status=el('select');[['ny','Ny'],['kontaktad','Kontaktad'],['klar','Avslutad']].forEach(([v,t])=>{const o=el('option',t);o.value=v;status.append(o);});status.value=r.status;status.addEventListener('change',async()=>{status.disabled=true;const next=status.value;try{await api('offertforfragningar?id=eq.'+encodeURIComponent(r.id),'PATCH',{status:next});r.status=next;render();notice('Status uppdaterad.');}catch(e){status.value=r.status;notice(e.message);}finally{status.disabled=false;}});ft.append(el('span','Status:'),status);if(r.telefon)addLink(ft,'Ring','tel:'+r.telefon.replace(/[^+\d]/g,''));if(r.epost)addLink(ft,'Mejla','mailto:'+encodeURIComponent(r.epost));const make=el('button','Skapa offert','outline');make.addEventListener('click',()=>{switchTab('offers');$('relatedRequest').value=r.id;prefill(r);$('offerName').focus();});ft.append(make);card.append(ft);root.append(card);}}
function drawCustomers(cs){const root=$('customers');root.replaceChildren();const q=$('customerSearch').value.trim().toLocaleLowerCase('sv');const list=cs.filter(c=>[c.name,c.phone,c.email].some(v=>String(v||'').toLocaleLowerCase('sv').includes(q)));if(!list.length){root.append(el('p','Inga kunder att visa.','empty'));return;}for(const c of list){const card=el('article',undefined,'quote'),h=el('div',undefined,'head');h.append(el('h2',c.name),el('span',c.items.length+' förfrågan/förfrågningar','status-pill'));card.append(h);const dl=el('dl');field(dl,'Telefon',c.phone);field(dl,'E-post',c.email);field(dl,'Senaste kontakt',dateFormat(c.items[0].skapad));card.append(dl);const history=el('details',undefined,'customerhistory'),summary=el('summary','Visa förfrågningshistorik'),ul=el('ul');for(const r of c.items){ul.append(el('li',dateFormat(r.skapad)+' – '+r.tjanst+' ('+r.status+')'));}history.append(summary,ul);card.append(history);const ft=el('div',undefined,'footer');if(c.phone)addLink(ft,'Ring kund','tel:'+c.phone.replace(/[^+\d]/g,''));if(c.email)addLink(ft,'Mejla kund','mailto:'+encodeURIComponent(c.email));card.append(ft);root.append(card);}}
function fillRequestOptions(){const s=$('relatedRequest'),old=s.value;s.replaceChildren();const d=el('option','Ingen – skapa manuellt');d.value='';s.append(d);for(const r of records){const o=el('option',r.namn+' – '+r.tjanst+' ('+(r.onskat_datum||'utan datum')+')');o.value=r.id;s.append(o);}if([...s.options].some(o=>o.value===old))s.value=old;}
function prefill(r){$('offerName').value=r.namn||'';$('offerEmail').value=r.epost||'';$('offerService').value=r.tjanst||'';$('offerDescription').value='Tjänst: '+(r.tjanst||'')+'\nStorlek: '+(r.storlek_kvm||'')+' m²\nAdress: '+(r.adress||'')+'\nÖnskat datum: '+(r.onskat_datum||'')+'\n\nDetta ingår:\n';$('offerPrice').value=r.rimligt_pris||'';}
function clearOffer(){$('offerForm').reset();$('offerError').textContent='';defaultValidDate();}
function defaultValidDate(){const d=new Date();d.setDate(d.getDate()+14);$('offerValid').value=d.toISOString().slice(0,10);}
function drawOffers(){const root=$('offers');root.replaceChildren();if(!offers.length){root.append(el('p','Inga offerter skapade ännu.','empty'));return;}for(const o of offers){const card=el('article',undefined,'quote'),h=el('div',undefined,'head');h.append(el('h2',o.kundnamn),el('strong',o.status==='skickad'?'Skickad':'Utkast'));card.append(h,el('p',o.tjanst+' · '+money(o.pris_inkl_moms)+' · giltig t.o.m. '+o.giltig_till,'meta'));const details=el('details',undefined,'customerhistory');details.append(el('summary','Visa offerttext'),el('p',o.beskrivning));card.append(details);const foot=el('div',undefined,'footer');const print=el('button','Skriv ut / PDF','outline');print.addEventListener('click',()=>printOffer(o));foot.append(print);
const send=el('button',o.status==='skickad'?'Skicka igen':'Skicka till kund');send.disabled=!o.epost;send.addEventListener('click',()=>sendOffer(o,send));foot.append(send);if(o.status==='skickad')foot.append(el('span','Skickad: '+dateFormat(o.skickad)));const copy=el('button','Kopiera offert','outline');copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(offerText(o));notice('Offerttext kopierad.');}catch{notice('Kunde inte kopiera texten.');}});foot.append(copy);card.append(foot);root.append(card);}}
function offerText(o){return 'OFFERT – FLYTT & FRÄSCHT\n\nTill: '+o.kundnamn+' ('+o.epost+')\nTjänst: '+o.tjanst+'\n\n'+o.beskrivning+'\n\nPris inklusive moms: '+money(o.pris_inkl_moms)+'\nGiltig till: '+o.giltig_till+'\n\nKontakt: flyttfrascht@gmail.com | 079-359 65 56';}
function printOffer(o){const w=window.open('','_blank','width=820,height=900');if(!w){notice('Tillåt popupfönster för att skriva ut offerten.');return;}w.opener=null;const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));w.document.write('<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>Offert – Flytt & Fräscht</title><style>body{font:17px system-ui;max-width:750px;margin:55px auto;color:#0b1b3f;padding:20px}h1{font-size:38px}h2{margin-top:40px}pre{font:inherit;white-space:pre-wrap}.price{font-size:26px;font-weight:800}footer{border-top:1px solid #aaa;margin-top:50px;padding-top:18px}</style></head><body><h1>Flytt & Fräscht</h1><p>OFFERT</p><h2>'+esc(o.kundnamn)+'</h2><p>'+esc(o.epost)+'</p><h3>'+esc(o.tjanst)+'</h3><pre>'+esc(o.beskrivning)+'</pre><p class="price">'+esc(money(o.pris_inkl_moms))+' inkl. moms</p><p>Giltig till: '+esc(o.giltig_till)+'</p><footer>flyttfrascht@gmail.com · 079-359 65 56</footer></body></html>');w.document.close();w.focus();w.print();}
async function sendOffer(o,btn){if(!confirm('Skicka offerten till '+o.epost+'? Kontrollera först text, belopp och mottagare.'))return;btn.disabled=true;btn.textContent='Skickar…';try{let r=await fetch(url+'/functions/v1/skicka-offert',{method:'POST',headers:headers(token),body:JSON.stringify({offer_id:o.id})});if(r.status===401&&await refresh())r=await fetch(url+'/functions/v1/skicka-offert',{method:'POST',headers:headers(token),body:JSON.stringify({offer_id:o.id})});const result=await r.json().catch(()=>({}));if(!r.ok)throw Error(result.error||'Mejlet kunde inte skickas. Kontrollera att Edge Function och Resend är aktiverade.');notice('Offerten skickades till '+o.epost+'.');await reload(true);}catch(e){notice('Offerten skickades inte: '+e.message);}finally{btn.disabled=false;btn.textContent='Skicka till kund';}}
async function reload(showMessage){try{if(showMessage)notice('Uppdaterar…');const [r,o,b]=await Promise.all([api('offertforfragningar?select=*&order=skapad.desc&limit=500'),api('offerter?select=*&order=skapad.desc&limit=500'),api('bokningar?select=*&order=datum.asc&limit=1500')]);records=r;offers=o;bookings=b;const ids=new Set(records.map(x=>x.id));if(lastIds!==null){const added=records.filter(x=>!lastIds.has(x.id));if(added.length){notice(added.length+' ny(a) offertförfrågan/förfrågningar!');if($('enableAlerts').checked&&window.Notification&&Notification.permission==='granted'){new Notification('Flytt & Fräscht',{body:added.length+' ny(a) offertförfrågan/förfrågningar'});}}else if(showMessage)notice('Uppdaterat.');}else if(showMessage)notice('');lastIds=ids;render();}catch(e){notice('Kunde inte läsa databasen: '+e.message);}}
async function sendBookingConfirmation(id){
 let r=await fetch(url+'/functions/v1/skicka-bokningsbekraftelse',{method:'POST',headers:headers(token),body:JSON.stringify({booking_id:id})});
 if(r.status===401&&await refresh())r=await fetch(url+'/functions/v1/skicka-bokningsbekraftelse',{method:'POST',headers:headers(token),body:JSON.stringify({booking_id:id})});
 const result=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(result.error||'Mejlet kunde inte skickas. Kontrollera Edge Function och Resend.');
 return result;
}
function ymd(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function monthTitle(d){return d.toLocaleDateString('sv-SE',{month:'long',year:'numeric'});}
function fillBookingOptions(){const s=$('bookingRequest'),v=s.value;s.replaceChildren();const empty=el('option','Ingen – boka manuellt');empty.value='';s.append(empty);for(const r of records){const o=el('option',r.namn+' – '+r.tjanst+' ('+(r.onskat_datum||'utan datum')+')');o.value=r.id;s.append(o);}if([...s.options].some(o=>o.value===v))s.value=v;}
function drawCalendar(){const grid=$('calendarGrid');grid.replaceChildren();$('calendarTitle').textContent=monthTitle(calendarDate);for(const day of ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'])grid.append(el('div',day,'calendar-weekday'));
const first=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1);const offset=(first.getDay()+6)%7;const today=ymd(new Date());const cells=Math.ceil((offset+new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,0).getDate())/7)*7;
for(let i=0;i<cells;i++){const d=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),i-offset+1),s=ymd(d),inside=d.getMonth()===calendarDate.getMonth(),day=el('button',undefined,'calendar-day'+(!inside?' muted':'')+(s===today?' today':'')+(s===selectedBookingDate?' selected':''));day.type='button';day.setAttribute('aria-label',d.toLocaleDateString('sv-SE',{dateStyle:'full'}));day.append(el('span',String(d.getDate()),'day-num'));const items=bookings.filter(b=>b.datum===s).sort((a,b)=>a.starttid.localeCompare(b.starttid));for(const b of items.slice(0,2)){const span=el('span',b.starttid.slice(0,5)+' '+b.kundnamn,'day-event'+(b.status==='avbokad'?' cancelled':''));day.append(span);}if(items.length>2)day.append(el('span','+'+(items.length-2)+' till','day-event'));day.addEventListener('click',()=>{selectedBookingDate=s;calendarDate=new Date(d.getFullYear(),d.getMonth(),1);if(!editingBookingId)$('bookingDate').value=s;drawCalendar();});grid.append(day);}
const root=$('bookingList');root.replaceChildren();const month=ymd(first).slice(0,7);let list=bookings.filter(b=>b.datum.startsWith(month));if(selectedBookingDate&&selectedBookingDate.startsWith(month))list=list.filter(b=>b.datum===selectedBookingDate);if(!list.length){root.append(el('p','Inga bokningar '+(selectedBookingDate&&selectedBookingDate.startsWith(month)?'den här dagen':'den här månaden')+'.','empty'));return;}
for(const b of list){const card=el('article',undefined,'quote booking-card'+(b.status==='avbokad'?' cancelled':'')),head=el('div',undefined,'head');head.append(el('h2',b.kundnamn),el('strong',b.status==='bekraftad'?'Bekräftad':b.status==='utford'?'Utförd':b.status==='avbokad'?'Avbokad':'Planerad'));card.append(head,el('p',b.datum+' · '+b.starttid.slice(0,5)+'–'+b.sluttid.slice(0,5)+' · '+b.tjanst,'meta'));const dl=el('dl');[['Personal',b.personal],['Adress',b.adress],['Telefon',b.telefon],['E-post',b.epost],['Anteckningar',b.anteckningar]].forEach(([l,v])=>field(dl,l,v));card.append(dl);const ft=el('div',undefined,'footer'),edit=el('button','Redigera','outline');edit.addEventListener('click',()=>openBooking(b));ft.append(edit);if(b.telefon)addLink(ft,'Ring','tel:'+b.telefon.replace(/[^+\d]/g,''));
if(b.bekraftelse_skickad){ft.append(el('span','Bekräftelse mejlad '+dateFormat(b.bekraftelse_skickad),'meta'));}
else if(b.status==='bekraftad'){
 const retry=el('button','Skicka bokningsbekräftelse','outline');
 retry.disabled=!b.epost;retry.title=b.epost?'':'Kundens e-postadress saknas';
 retry.addEventListener('click',async()=>{if(!confirm('Skicka bokningsbekräftelse till '+b.epost+'?'))return;retry.disabled=true;retry.textContent='Skickar…';try{const r=await sendBookingConfirmation(b.id);await reload(false);notice(r.already_sent?'Bekräftelsen hade redan skickats.':'Bokningsbekräftelsen skickades till '+b.epost+'.');}catch(e){notice('Bokningen finns kvar, men mejlet gick inte iväg: '+e.message);}finally{retry.disabled=false;retry.textContent='Skicka bokningsbekräftelse';}});ft.append(retry);
}
card.append(ft);root.append(card);}}
function resetBooking(){editingBookingId=null;setTimeout(scheduleAvailability,0);$('bookingForm').reset();$('bookingFormTitle').textContent='Lägg till uppdrag';$('bookingSave').textContent='Spara bokning';$('bookingDelete').hidden=true;$('bookingError').textContent='';$('bookingDate').value=selectedBookingDate||ymd(new Date());$('bookingStart').value='09:00';$('bookingEnd').value='12:00';}
function openBooking(b){editingBookingId=b.id;setTimeout(scheduleAvailability,0);const values={bookingRequest:b.forfragan_id||'',bookingCustomer:b.kundnamn,bookingPhone:b.telefon||'',bookingEmail:b.epost||'',bookingService:b.tjanst,bookingAddress:b.adress||'',bookingDate:b.datum,bookingStaff:b.personal||'',bookingStart:b.starttid.slice(0,5),bookingEnd:b.sluttid.slice(0,5),bookingStatus:b.status,bookingNotes:b.anteckningar||''};for(const [id,value] of Object.entries(values))$(id).value=value;$('bookingFormTitle').textContent='Redigera bokning';$('bookingSave').textContent='Spara ändringar';$('bookingDelete').hidden=false;$('bookingError').textContent='';$('bookingEditor').scrollIntoView({behavior:'smooth',block:'start'});}
$('calendarPrev').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);selectedBookingDate='';drawCalendar();});
$('calendarNext').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);selectedBookingDate='';drawCalendar();});
$('calendarToday').addEventListener('click',()=>{calendarDate=new Date();selectedBookingDate=ymd(new Date());if(!editingBookingId)$('bookingDate').value=selectedBookingDate;drawCalendar();});
$('bookingRequest').addEventListener('change',()=>{const r=records.find(r=>r.id===$('bookingRequest').value);if(!r)return;$('bookingCustomer').value=r.namn||'';$('bookingPhone').value=r.telefon||'';$('bookingEmail').value=r.epost||'';$('bookingService').value=[...$('bookingService').options].some(o=>o.value===r.tjanst)?r.tjanst:'Annat';$('bookingAddress').value=r.adress||'';if(r.onskat_datum)$('bookingDate').value=r.onskat_datum;});
$('bookingReset').addEventListener('click',resetBooking);

// Ledighetskontroll. Hämtning sker via en skyddad Supabase Edge Function,
// aldrig direkt från webbsidan med en Firebase-servicekontonyckel.
const STAFF_NAMES=['Arsi','Omar','Naji','Taher','Adel','Ammar','Abdul','Baraa'];
let availabilitySequence=0,latestAvailability=null,availabilityTimer=null;
const splitStaff=s=>String(s||'').split(/\s*(?:,|;|\+|&|\/|\boch\b)\s*/i).map(x=>x.trim().toLocaleLowerCase('sv-SE')).filter(Boolean);
const minutes=s=>{const m=/^(\d{2}):(\d{2})/.exec(String(s||''));return m?Number(m[1])*60+Number(m[2]):NaN;};
const overlaps=(a,b,c,d)=>minutes(a)<minutes(d)&&minutes(b)>minutes(c);
function bookingConflicts(date,start,end){
 return bookings.filter(b=>b.id!==editingBookingId && b.datum===date && b.status!=='avbokad' && overlaps(start,end,b.starttid,b.sluttid));
}
async function loadAvailability(date,force=false){
 if(!date)return null;
 if(!force&&latestAvailability?.date===date&&Date.now()-latestAvailability.at<30000)return latestAvailability;
 let r=await fetch(url+'/functions/v1/kontrollera-ledighet?date='+encodeURIComponent(date),{method:'GET',headers:headers(token),cache:'no-store'});
 if(r.status===401&&await refresh())r=await fetch(url+'/functions/v1/kontrollera-ledighet?date='+encodeURIComponent(date),{method:'GET',headers:headers(token),cache:'no-store'});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.error||'Kan inte kontrollera ledigheten i Timerflytt.');
 if(!Array.isArray(j.staff))throw Error('Felaktigt svar från ledighetskontrollen.');
 latestAvailability={date,at:Date.now(),staff:j.staff};return latestAvailability;
}
function statusForStaff(person,date,start,end,unavailable){
 const name=person.toLocaleLowerCase('sv-SE');
 const absence=unavailable.find(s=>s.name?.toLocaleLowerCase('sv-SE')===name)?.blocks||[];
 const absences=absence.filter(x=>overlaps(start,end,x.start,x.end));
 const assigned=bookingConflicts(date,start,end).filter(b=>splitStaff(b.personal).includes(name));
 const reasons=[];
 if(absences.length)reasons.push('Ledig: '+absences.map(x=>x.start+'–'+x.end).join(', '));
 if(assigned.length)reasons.push('Redan bokad: '+assigned.map(b=>b.starttid.slice(0,5)+'–'+b.sluttid.slice(0,5)).join(', '));
 return {person,conflict:reasons.length>0,reasons};
}
async function updateAvailability(force=false){
 const date=$('bookingDate').value,start=$('bookingStart').value,end=$('bookingEnd').value;
 const box=$('availabilityList'),status=$('availabilityStatus'),run=++availabilitySequence;
 box.replaceChildren();
 if(!date||!start||!end||minutes(start)>=minutes(end)){status.textContent='Välj ett giltigt datum och arbetstid.';return;}
 status.textContent='Kontrollerar personalens ledighet…';
 try{
  const snapshot=await loadAvailability(date,force);
  if(run!==availabilitySequence)return;
  const names=Array.from(new Set([...STAFF_NAMES,...snapshot.staff.map(s=>s.name).filter(Boolean)]));
  const statuses=names.map(n=>statusForStaff(n,date,start,end,snapshot.staff)).sort((a,b)=>Number(a.conflict)-Number(b.conflict));
  for(const s of statuses){const card=el('div',undefined,'availability-staff '+(s.conflict?'conflict':'available'));
   const info=el('div');info.append(el('strong',s.person),el('small',s.reasons.join(' · ')||( 'Ingen registrerad frånvaro eller överlappande bokning')));
   card.append(info,el('span',s.conflict?'Upptagen':'Inget hinder hittat','avail-tag'));box.append(card);}
  status.textContent='Kontrollerat '+new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})+'. Uppgifterna är en ögonblicksbild.';
 }catch(err){if(run!==availabilitySequence)return;status.textContent='⚠ '+err.message+' Kontrollera serverinställningarna innan du bokar.';}
}
function scheduleAvailability(){clearTimeout(availabilityTimer);availabilityTimer=setTimeout(()=>updateAvailability(),300);}
['bookingDate','bookingStart','bookingEnd','bookingStaff'].forEach(id=>$(id).addEventListener('change',scheduleAvailability));
$('availabilityRefresh').addEventListener('click',()=>{latestAvailability=null;updateAvailability(true);});

$('bookingForm').addEventListener('submit',async ev=>{ev.preventDefault();const btn=$('bookingSave');btn.disabled=true;$('bookingError').textContent='';try{const data={forfragan_id:$('bookingRequest').value||null,kundnamn:$('bookingCustomer').value.trim(),telefon:$('bookingPhone').value.trim()||null,epost:$('bookingEmail').value.trim()||null,tjanst:$('bookingService').value,adress:$('bookingAddress').value.trim()||null,datum:$('bookingDate').value,starttid:$('bookingStart').value,sluttid:$('bookingEnd').value,personal:$('bookingStaff').value.trim()||null,status:$('bookingStatus').value,anteckningar:$('bookingNotes').value.trim()||null};if(!data.kundnamn||!data.datum||!data.starttid||!data.sluttid||data.starttid>=data.sluttid)throw Error('Kontrollera namn, datum och att sluttiden är efter starttiden.');
// Gör om kontrollen precis före sparning så senaste ledigheten används.
if(data.status!=='avbokad' && data.personal){
 const selected=splitStaff(data.personal),known=new Set(STAFF_NAMES.map(x=>x.toLocaleLowerCase('sv-SE')));
 const unknown=selected.filter(x=>!known.has(x));
 if(unknown.length)throw Error('Okänt personnamn: '+unknown.join(', ')+'. Använd namnen som finns i Timerflytt.');
 const check=await loadAvailability(data.datum,true);
 const conflict=selected.map(n=>statusForStaff(STAFF_NAMES.find(x=>x.toLocaleLowerCase('sv-SE')===n),data.datum,data.starttid,data.sluttid,check.staff)).filter(x=>x.conflict);
 if(conflict.length&&!confirm('VARNING: Följande personal har registrerad frånvaro eller annat uppdrag:\n\n'+conflict.map(x=>x.person+': '+x.reasons.join(', ')).join('\n')+'\n\nVill du spara bokningen ändå?'))return;
}
const overlap=bookings.find(b=>b.id!==editingBookingId&&b.datum===data.datum&&b.status!=='avbokad'&&data.status!=='avbokad'&&data.starttid<b.sluttid.slice(0,5)&&data.sluttid>b.starttid.slice(0,5));if(overlap&&!confirm('Det finns redan ett uppdrag som överlappar den här tiden ('+overlap.kundnamn+'). Vill du spara ändå?'))return;
const original=editingBookingId?bookings.find(b=>b.id===editingBookingId):null;
let bookingId=editingBookingId;
if(editingBookingId)await api('bokningar?id=eq.'+encodeURIComponent(editingBookingId),'PATCH',data);
else {const created=await api('bokningar','POST',data);bookingId=created?.[0]?.id;if(!bookingId)throw Error('Bokningen sparades, men ID kunde inte läsas. Uppdatera sidan.');}
calendarDate=new Date(Number(data.datum.slice(0,4)),Number(data.datum.slice(5,7))-1,1);selectedBookingDate=data.datum;resetBooking();await reload(false);
let message='Bokningen har sparats.';
if(data.status==='bekraftad'&&!(original?.bekraftelse_skickad)){
 if(!data.epost)message+=' Ingen bekräftelse skickades eftersom kunden saknar e-postadress.';
 else {try{const sent=await sendBookingConfirmation(bookingId);message+=sent.warning?' Mejlet accepterades, men status kunde inte sparas: '+sent.warning:(sent.already_sent?' Bekräftelse var redan skickad.':' Bokningsbekräftelse skickad till '+data.epost+'.');await reload(false);}catch(err){message+=' OBS: Mejlet gick INTE iväg: '+err.message+' Välj bokningen och försök igen med knappen Skicka bokningsbekräftelse.';}}
}else if(data.status==='bekraftad'&&original?.bekraftelse_skickad){
 message+=' Bekräftelse skickades tidigare. Ändrade tider skickas inte automatiskt på nytt; kontakta kunden vid ändringar.';
}
notice(message);}catch(e){$('bookingError').textContent=e.message;}finally{btn.disabled=false;}});
$('bookingDelete').addEventListener('click',async()=>{if(!editingBookingId||!confirm('Ta bort den här bokningen permanent?'))return;const id=editingBookingId;try{await api('bokningar?id=eq.'+encodeURIComponent(id),'DELETE');resetBooking();await reload(false);notice('Bokningen har tagits bort.');}catch(e){$('bookingError').textContent=e.message;}});
resetBooking();
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';$('loginBtn').disabled=true;try{if(!validConfig)throw Error('Supabase är inte konfigurerat.');await login($('username').value,$('password').value);$('password').value='';showDashboard();}catch(err){$('loginError').textContent=err.message;}finally{$('loginBtn').disabled=false;}});
$('logoutBtn').addEventListener('click',showLogin);$('refreshBtn').addEventListener('click',()=>reload(true));$('search').addEventListener('input',drawRequests);$('filter').addEventListener('change',drawRequests);$('customerSearch').addEventListener('input',()=>drawCustomers(customersData()));document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
$('relatedRequest').addEventListener('change',()=>{const r=records.find(x=>x.id===$('relatedRequest').value);if(r)prefill(r);});$('clearOfferBtn').addEventListener('click',clearOffer);
$('offerForm').addEventListener('submit',async e=>{e.preventDefault();$('offerError').textContent='';const btn=$('saveOfferBtn');btn.disabled=true;try{const payload={forfragan_id:$('relatedRequest').value||null,kundnamn:$('offerName').value.trim(),epost:$('offerEmail').value.trim().toLowerCase(),tjanst:$('offerService').value.trim(),beskrivning:$('offerDescription').value.trim(),pris_inkl_moms:Number($('offerPrice').value),giltig_till:$('offerValid').value,status:'utkast'};if(!payload.kundnamn||!payload.epost||!payload.beskrivning||!payload.tjanst||payload.pris_inkl_moms<=0||!payload.giltig_till)throw Error('Fyll i alla obligatoriska fält.');await api('offerter','POST',payload);clearOffer();await reload(true);notice('Offerten är sparad. Granska den och välj Skicka till kund.');}catch(err){$('offerError').textContent=err.message;}finally{btn.disabled=false;}});
$('enableAlerts').addEventListener('change',async e=>{if(e.target.checked&&'Notification' in window){const p=await Notification.requestPermission();if(p!=='granted'){e.target.checked=false;notice('Webbläsarnotiser nekades. Nya förfrågningar visas ändå i adminpanelen.');}}});defaultValidDate();
try{const s=JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null');if(s&&validConfig){token=s.token;refreshToken=s.refreshToken;showDashboard();}}catch{}
})();
