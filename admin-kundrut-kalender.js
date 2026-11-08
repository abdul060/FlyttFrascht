/* Flytt & Fräscht · kundhistorik, RUT-arbetsunderlag och bokningsvarningar.
   Separat tillägg: ändrar inte admin.js, databokningar eller Timerflytt. */
(()=>{'use strict';
const cfg=window.FLYTT_CONFIG||{}, base=String(cfg.supabaseUrl||'').replace(/\/$/,''),apiKey=cfg.supabaseAnonKey||'';
const dashboard=document.querySelector('#dashboard'),nav=document.querySelector('#dashboard .tabs');
if(!dashboard||!nav||!base.startsWith('https://')||!apiKey)return;
const $=s=>document.querySelector(s), mk=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=String(txt);if(cls)x.className=cls;return x};
const fmtMoney=n=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:2}).format(Number(n)||0);
const date=s=>{if(!s)return '–';const d=new Date(s);return Number.isNaN(+d)?String(s):d.toLocaleDateString('sv-SE',{year:'numeric',month:'short',day:'numeric'})};
const normEmail=s=>String(s||'').trim().toLocaleLowerCase('sv-SE');
const normPhone=s=>String(s||'').replace(/\D/g,'').replace(/^46(?=7\d{8}$)/,'0');
const normName=s=>String(s||'').trim().toLocaleLowerCase('sv-SE').replace(/\s+/g,' ');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>{try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'{}').token||''}catch{return ''}};
async function getTable(table,query){const t=token();if(!t)throw Error('Logga in igen i adminpanelen.');const r=await fetch(`${base}/rest/v1/${table}?${query}`,{headers:{apikey:apiKey,Authorization:'Bearer '+t},cache:'no-store'});const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.message||body.error||`HTTP ${r.status} vid hämtning`);return body}
async function saveRut(data){const t=token();if(!t)throw Error('Logga in igen.');const r=await fetch(`${base}/rest/v1/ff_rut_underlag`,{method:'POST',headers:{apikey:apiKey,Authorization:'Bearer '+t,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(data)});const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.message||body.error||`HTTP ${r.status}`);return body}

/* Separate tabs. Avoid touching existing navigation logic. */
function addTab(label,id){const btn=mk('button',label);btn.type='button';btn.dataset.ffExtra=id;nav.append(btn);return btn}
const customerTab=addTab('👥 Kundhistorik','history'),rutTab=addTab('🧾 RUT-underlag','rut');
const customerPane=mk('section',undefined,'tab-content ff-next-panel');customerPane.id='ffCustomerHistory';customerPane.hidden=true;
const rutPane=mk('section',undefined,'tab-content ff-next-panel');rutPane.id='ffRutPanel';rutPane.hidden=true;
dashboard.append(customerPane,rutPane);
function hideExtra(){customerPane.hidden=true;rutPane.hidden=true;customerTab.classList.remove('active');rutTab.classList.remove('active')}
// Originalflikarna binds via admin.js. Fotofliken binds via admin-jobbfoton.js.
nav.querySelectorAll('[data-tab],[data-photo-tab]').forEach(b=>b.addEventListener('click',hideExtra));
function openExtra(which){if(dashboard.hidden)return;document.querySelectorAll('.tab-content').forEach(p=>p.hidden=true);nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));const pane=which==='history'?customerPane:rutPane;pane.hidden=false;(which==='history'?customerTab:rutTab).classList.add('active');if(which==='history')loadCustomerHistory();else loadRutList()}
customerTab.addEventListener('click',()=>openExtra('history'));rutTab.addEventListener('click',()=>openExtra('rut'));
function heading(pane,title,eyebrow,desc){const hdr=mk('div',undefined,'ff-next-header');const inner=mk('div');inner.append(mk('span',eyebrow,'ff-next-eyebrow'),mk('h2',title),mk('p',desc));hdr.append(inner);pane.append(hdr)}

/* KUNDHISTORIK. No name-only merging; request-id, email, then phone.
   This is a historical overview of records currently retained, not a CRM source of truth. */
heading(customerPane,'Kundhistorik','KUNDER & UPPDRAG','Samlade förfrågningar, offerter och bokningar från Supabase.');
const cFilters=mk('div',undefined,'ff-next-card ff-next-controls'),cSearch=mk('input');cSearch.type='search';cSearch.placeholder='Sök kund, mejl eller telefon';cSearch.setAttribute('aria-label','Sök kundhistorik');
const cRefresh=mk('button','↻ Uppdatera');cRefresh.type='button';cFilters.append(cSearch,cRefresh);customerPane.append(cFilters);
const cStatus=mk('p','Öppna fliken för att läsa kundhistorik.','ff-next-status'),cList=mk('div',undefined,'ff-next-list');cStatus.setAttribute('role','status');customerPane.append(cStatus,cList);
let customerGroups=[];let cLoadedAt=0;
function buildHistory(reqs,offers,bookings){
 const groups=new Map(),requestMap=new Map();let sequence=0;
 function keyFor(o){const e=normEmail(o.epost),p=normPhone(o.telefon);return e?'e:'+e:p?'p:'+p:null}
 function groupFor(o){const k=keyFor(o)||'unknown:'+(++sequence);if(!groups.has(k))groups.set(k,{key:k,name:o.namn||o.kundnamn||'Okänd kund',email:o.epost||'',phone:o.telefon||'',requests:[],offers:[],bookings:[]});return groups.get(k)}
 // Match linked bookings/offers by forfragan_id before contact identity. Avoid matches by name only.
 for(const r of reqs){const g=groupFor(r);g.requests.push(r);requestMap.set(String(r.id),g)}
 function put(o,type){const linked=o.forfragan_id!=null?requestMap.get(String(o.forfragan_id)):null;const directKey=keyFor(o);let g=linked||(directKey&&groups.get(directKey));if(!g)g=groupFor(o);
  if(!g.email&&o.epost)g.email=o.epost;if(!g.phone&&o.telefon)g.phone=o.telefon;
  g[type].push(o)
 }
 offers.forEach(o=>put(o,'offers'));bookings.forEach(b=>put(b,'bookings'));
 return [...groups.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name),'sv'));
}
function customerEvents(g){const events=[];
 g.requests.forEach(r=>events.push({when:r.skapad||r.onskat_datum,title:'Offertförfrågan',details:[r.tjanst,r.status].filter(Boolean).join(' · ')}));
 g.offers.forEach(o=>events.push({when:o.skapad||o.skickad,title:'Offert',details:[o.tjanst,fmtMoney(o.pris_inkl_moms),o.kundbeslut==='accepterad'?'Accepterad':o.status].filter(Boolean).join(' · ')}));
 g.bookings.forEach(b=>events.push({when:b.datum,title:b.status==='utford'?'Utfört uppdrag':'Bokning',details:[b.tjanst,b.status,b.starttid?String(b.starttid).slice(0,5):''].filter(Boolean).join(' · ')}));
 return events.sort((a,b)=>String(b.when).localeCompare(String(a.when)));
}
function renderCustomers(){cList.replaceChildren();const q=normName(cSearch.value);const matched=customerGroups.filter(g=>[g.name,g.email,g.phone].some(x=>normName(x).includes(q)));
 if(!matched.length){cList.append(mk('div','Inga kunder matchar din sökning.','ff-next-empty'));return}
 for(const g of matched){const card=mk('article',undefined,'ff-next-card ff-next-item'),head=mk('div',undefined,'ff-next-itemhead');head.append(mk('strong',g.name),mk('span',g.bookings.length+' bokningar','ff-next-pill'));card.append(head,mk('div',[g.email,g.phone].filter(Boolean).join(' · ')||'Kontaktuppgifter saknas','ff-next-meta'));
 const numbers=mk('div',undefined,'ff-next-numbers');for(const [n,v] of [['Förfrågningar',g.requests.length],['Offerter',g.offers.length],['Bokningar',g.bookings.length],['Utförda (markerade)',g.bookings.filter(b=>b.status==='utford').length]]){const box=mk('div',undefined,'ff-next-number');box.append(mk('small',n),mk('strong',String(v)));numbers.append(box)}card.append(numbers);
 const detail=mk('details'),summary=mk('summary','Visa hela historiken');summary.style.cursor='pointer';summary.style.fontWeight='750';detail.append(summary);
 const timeline=mk('div',undefined,'ff-next-timeline');for(const e of customerEvents(g)){const ev=mk('div',undefined,'ff-next-event');ev.append(mk('b',`${date(e.when)} · ${e.title}`),mk('span',e.details||'–'));timeline.append(ev)}detail.append(timeline);card.append(detail);cList.append(card)
 }
}
async function loadCustomerHistory(){if(!token()){cStatus.textContent='Logga in igen i adminpanelen.';return}cStatus.textContent='Hämtar kundhistorik…';cRefresh.disabled=true;
 try{const [requests,offers,bookings]=await Promise.all([getTable('offertforfragningar','select=*&order=skapad.desc&limit=500'),getTable('offerter','select=*&order=skapad.desc&limit=500'),getTable('bokningar','select=*&order=datum.desc&limit=1500')]);customerGroups=buildHistory(requests,offers,bookings);cLoadedAt=Date.now();renderCustomers();cStatus.textContent=`${customerGroups.length} kundgrupper. Visar högst 500 förfrågningar, 500 offerter och 1 500 bokningar. Länkning sker via förfrågnings-ID, mejl eller telefon – namn ensamt används inte.`}
 catch(e){cStatus.textContent='Kunde inte hämta kundhistoriken: '+e.message;cList.replaceChildren()}finally{cRefresh.disabled=false}}
cRefresh.addEventListener('click',loadCustomerHistory);cSearch.addEventListener('input',renderCustomers);

/* RUT-UNDERLAG: administrative planning, not an invoice or Skatteverket submission. */
heading(rutPane,'RUT-underlag','ADMINISTRATIVT UNDERLAG','Samla arbetskostnad, övriga kostnader och uppgifter om utfört arbete och betalning. Ingen ansökan skickas.');
const rutNote=mk('p','RUT kan normalt vara högst 50 % av arbetskostnaden inklusive moms, men beror på tjänst och kundens förutsättningar. Arbetet måste vara utfört och elektroniskt betalt före ansökan. Ange bara personnummer i ett särskilt säkert faktura-/RUT-system – inte här.','ff-next-hint');rutPane.append(rutNote);
const rutColumns=mk('div',undefined,'ff-next-grid'),formCard=mk('section',undefined,'ff-next-card'),listCard=mk('section',undefined,'ff-next-card');
formCard.append(mk('h3','Nytt underlag'));listCard.append(mk('h3','Sparade RUT-underlag'));rutColumns.append(formCard,listCard);rutPane.append(rutColumns);
const form=mk('form',undefined,'ff-next-form');form.id='ffRutForm';
function input(id,label,type='text',required=false,opts={}){const wrap=mk('label',label,'ff-next-field'+(opts.full?' ff-next-full':'')),el=mk(type==='textarea'?'textarea':'input');el.id=id;if(type!=='textarea')el.type=type;el.required=required;if(opts.min!==undefined)el.min=String(opts.min);if(opts.step!==undefined)el.step=String(opts.step);if(opts.placeholder)el.placeholder=opts.placeholder;wrap.append(el);form.append(wrap);return el}
const fName=input('ffRutName','Kundnamn', 'text',true),fEmail=input('ffRutEmail','E-post'),fService=input('ffRutService','Tjänst', 'text',true),fWorkDate=input('ffRutWorkDate','Arbetsdatum','date'),fInvoice=input('ffRutInvoice','Faktura-/referensnummer'),fLabor=input('ffRutLabor','Arbetskostnad inkl. moms (kr)','number',true,{min:0,step:0.01}),fMaterial=input('ffRutMaterial','Material inkl. moms (kr)','number',false,{min:0,step:0.01}),fOther=input('ffRutOther','Övrigt, t.ex. transport inkl. moms (kr)','number',false,{min:0,step:0.01}),fDeduction=input('ffRutDeduction','Planerat RUT-avdrag (kr, max 50 % av arbete)','number',false,{min:0,step:0.01}),fPaymentDate=input('ffRutPaymentDate','Betalningsdatum','date'),fPaymentRef=input('ffRutPaymentRef','Betalningsreferens (inte kortnummer)'),fPaid=input('ffRutPaid','Mottagen betalning (kr)','number',false,{min:0,step:0.01}),fNotes=input('ffRutNotes','Kommentar','textarea',false,{full:true});
for(const e of [fLabor,fMaterial,fOther,fDeduction,fPaid])e.value='0';
const result=mk('div',undefined,'ff-next-rut-result ff-next-full');const total=mk('div'),rutSum=mk('div');total.append(mk('span','Totalt före RUT'),mk('strong','0 kr'));rutSum.append(mk('span','Kundens belopp efter planerat RUT'),mk('strong','0 kr'));result.append(total,rutSum);form.append(result);
function parseNum(x){const n=Number(x.value);return Number.isFinite(n)?Math.max(0,n):0}
function calcRut(){const labor=parseNum(fLabor),material=parseNum(fMaterial),other=parseNum(fOther),limit=Math.round(labor*50)/100,deduction=parseNum(fDeduction);fDeduction.max=String(limit);total.querySelector('strong').textContent=fmtMoney(labor+material+other);rutSum.querySelector('strong').textContent=fmtMoney(labor+material+other-deduction);return {labor,material,other,deduction,limit}}
for(const x of [fLabor,fMaterial,fOther,fDeduction])x.addEventListener('input',calcRut);calcRut();
const fActions=mk('div',undefined,'ff-next-actions ff-next-full'),save=mk('button','Spara underlag'),fStatus=mk('p','','ff-next-status ff-next-full');save.type='submit';fStatus.setAttribute('role','status');fActions.append(save);form.append(fActions,fStatus);formCard.append(form);
const rutRefresh=mk('button','↻ Uppdatera','ff-next-btn-secondary ff-next-btn-small'),rutStatus=mk('p','Öppna fliken för att läsa underlag.','ff-next-status'),rutList=mk('div',undefined,'ff-next-list');rutRefresh.type='button';listCard.append(rutRefresh,rutStatus,rutList);
let rutRows=[];
function renderRut(){rutList.replaceChildren();if(!rutRows.length){rutList.append(mk('p','Inga underlag sparade.','ff-next-empty'));return}
 for(const r of rutRows){const card=mk('article',undefined,'ff-next-item'),head=mk('div',undefined,'ff-next-itemhead');head.append(mk('strong',r.customer_name),mk('span',r.status==='granskad'?'Granskad':'Utkast','ff-next-pill'));card.append(head,mk('div',`${r.service||''} · ${date(r.work_date)} · ${r.invoice_number||'Referens saknas'}`,'ff-next-meta'));
 const nums=mk('div',undefined,'ff-next-numbers');for(const [name,value] of [['Arbetskostnad',fmtMoney(r.labor_cost)],['Planerat RUT',fmtMoney(r.rut_requested)],['Mottagen betalning',fmtMoney(r.paid_amount)]]){const box=mk('div',undefined,'ff-next-number');box.append(mk('small',name),mk('strong',value));nums.append(box)}card.append(nums,mk('div',`Material: ${fmtMoney(r.material_cost)} · Övrigt: ${fmtMoney(r.other_cost)} · Betaldatum: ${r.payment_date||'Ej angivet'}`,'ff-next-meta'));
 const acts=mk('div',undefined,'ff-next-actions');const print=mk('button','Skriv ut underlag','ff-next-btn-secondary ff-next-btn-small');print.type='button';print.addEventListener('click',()=>printRut(r));acts.append(print);card.append(acts);rutList.append(card)
 }
}
async function loadRutList(){rutStatus.textContent='Hämtar RUT-underlag…';rutRefresh.disabled=true;try{rutRows=await getTable('ff_rut_underlag','select=*&order=created_at.desc&limit=200');renderRut();rutStatus.textContent=`${rutRows.length} sparade underlag. Inga uppgifter skickas till Skatteverket.`}catch(e){rutStatus.textContent='Kan inte läsa RUT-underlagen: '+e.message;rutList.replaceChildren()}finally{rutRefresh.disabled=false}}
rutRefresh.addEventListener('click',loadRutList);
form.addEventListener('submit',async e=>{e.preventDefault();const v=calcRut();if(v.deduction>v.limit+0.001){fStatus.textContent='RUT-beloppet är större än 50 % av arbetskostnaden.';return}if(v.deduction>0&&!fWorkDate.value){fStatus.textContent='Ange datum då arbetet utförts.';return}
 const data={customer_name:fName.value.trim(),customer_email:fEmail.value.trim()||null,service:fService.value.trim(),work_date:fWorkDate.value||null,invoice_number:fInvoice.value.trim()||null,labor_cost:v.labor,material_cost:v.material,other_cost:v.other,rut_requested:v.deduction,payment_date:fPaymentDate.value||null,payment_reference:fPaymentRef.value.trim()||null,paid_amount:parseNum(fPaid),status:'utkast',notes:fNotes.value.trim()||null};
 save.disabled=true;fStatus.textContent='Sparar underlaget…';try{await saveRut(data);form.reset();for(const x of [fLabor,fMaterial,fOther,fDeduction,fPaid])x.value='0';calcRut();fStatus.textContent='✅ Utkast sparat. Kontrollera rätt till RUT och betalning innan ansökan.';await loadRutList()}catch(err){fStatus.textContent='Kunde inte spara: '+err.message}finally{save.disabled=false}
});
function printRut(r){const d=document.createElement('iframe');d.style.position='fixed';d.style.width='0';d.style.height='0';d.style.opacity='0';d.setAttribute('title','RUT-underlag för utskrift');document.body.append(d);const doc=d.contentDocument;doc.open();doc.write(`<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>RUT-underlag</title><style>body{font:16px system-ui;margin:40px;color:#172b45}h1{border-bottom:3px solid #eb8b36;padding-bottom:12px}p{margin:11px 0}.note{background:#fff1dd;padding:12px;margin-top:25px}</style></head><body><h1>Flytt &amp; Fräscht – RUT-arbetsunderlag</h1><p><b>Kund:</b> ${esc(r.customer_name)}</p><p><b>Tjänst:</b> ${esc(r.service)}</p><p><b>Arbetsdatum:</b> ${esc(r.work_date||'Ej angivet')}</p><p><b>Faktura:</b> ${esc(r.invoice_number||'Ej angivet')}</p><p><b>Arbetskostnad inkl. moms:</b> ${esc(fmtMoney(r.labor_cost))}</p><p><b>Material inkl. moms:</b> ${esc(fmtMoney(r.material_cost))}</p><p><b>Övriga kostnader inkl. moms:</b> ${esc(fmtMoney(r.other_cost))}</p><p><b>Planerat RUT-avdrag:</b> ${esc(fmtMoney(r.rut_requested))}</p><p><b>Mottagen betalning:</b> ${esc(fmtMoney(r.paid_amount))}</p><p><b>Betaldatum:</b> ${esc(r.payment_date||'Ej angivet')}</p><p><b>Betalningsreferens:</b> ${esc(r.payment_reference||'Ej angivet')}</p><p><b>Kommentar:</b> ${esc(r.notes||'–')}</p><p class="note">Intern arbetskopia – inte faktura, inte ansökan och inte ett godkännande från Skatteverket. Kontrollera tjänst, kundens rätt, arbetstimmar, F-skatt och elektronisk betalning.</p></body></html>`);doc.close();setTimeout(()=>{try{d.contentWindow.focus();d.contentWindow.print()}catch{}setTimeout(()=>d.remove(),60000)},400)}

/* LIVE CONFLICT PREVIEW. Existing booking save confirmation remains intact. */
const bookingForm=$('#bookingForm');
if(bookingForm){const panel=mk('section',undefined,'ff-next-hint');panel.id='ffNextBookingConflicts';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.textContent='Välj datum och tid för att kontrollera dubbelbokningar.';const target=$('#availability-panel')||bookingForm.querySelector('.availability-panel');if(target)target.parentNode.insertBefore(panel,target);else bookingForm.append(panel);
 let sequence=0,delay=0;
 const names=s=>String(s||'').split(/\s*(?:,|;|\+|&|\/|\boch\b)\s*/i).map(x=>normName(x)).filter(Boolean);
 const mins=s=>{const m=/^(\d\d):(\d\d)/.exec(String(s||''));return m?Number(m[1])*60+Number(m[2]):NaN};
 const overlap=(a,b,c,d)=>mins(a)<mins(d)&&mins(b)>mins(c);
 async function preview(){const seq=++sequence;const bDate=$('#bookingDate')?.value,bStart=$('#bookingStart')?.value,bEnd=$('#bookingEnd')?.value,staffNames=names($('#bookingStaff')?.value);panel.replaceChildren();panel.dataset.warning='false';
  if(!bDate||!bStart||!bEnd||!(mins(bStart)<mins(bEnd))){panel.textContent='Välj datum och giltig arbetstid för att kontrollera.';return}
  if(!staffNames.length){panel.textContent='Ange tilldelad personal för att kontrollera deras bokade tider.';return}
  panel.textContent='Kontrollerar bokningar…';
  try{const books=await getTable('bokningar',`select=id,kundnamn,datum,starttid,sluttid,personal,status&datum=eq.${encodeURIComponent(bDate)}&limit=1000`);if(seq!==sequence)return;
   const conflicts=books.filter(b=>b.status!=='avbokad'&&overlap(bStart,bEnd,b.starttid,b.sluttid)&&names(b.personal).some(n=>staffNames.includes(n)));
   // Editing a booking: if its own saved time matches identically, show a possible self-match disclaimer.
   if(!conflicts.length){panel.textContent='✅ Ingen dubbelbokning hittad för vald personal och tid. Kontrollera även ledighet nedan.';return}
   panel.dataset.warning='true';panel.append(mk('strong',`⚠ ${conflicts.length} överlappande bokning(ar) för vald personal`));
   const list=mk('div',undefined,'ff-next-conflicts');for(const b of conflicts){const item=mk('div',undefined,'ff-next-conflict');item.append(mk('strong',b.kundnamn||'Bokning'),mk('span',`${String(b.starttid).slice(0,5)}–${String(b.sluttid).slice(0,5)} · ${b.personal||''}`));list.append(item)}panel.append(list,mk('p','Den här kontrollen är en varning. Den befintliga bokningskontrollen körs fortfarande när du sparar. Vid redigering kan det aktuella uppdraget visas i listan.','ff-next-note'));
  }catch(e){if(seq===sequence){panel.dataset.warning='true';panel.textContent='⚠ Kunde inte kontrollera bokningarna: '+e.message+'. Kontrollera manuellt innan du sparar.'}}
 }
 for(const id of ['bookingDate','bookingStart','bookingEnd','bookingStaff']){const input=$('#'+id);if(input)for(const ev of ['input','change'])input.addEventListener(ev,()=>{clearTimeout(delay);delay=setTimeout(preview,350)})}
 const originalBookings=nav.querySelector('[data-tab="bookings"]');if(originalBookings)originalBookings.addEventListener('click',()=>setTimeout(preview,100));
}
})();
